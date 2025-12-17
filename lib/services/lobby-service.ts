import { generateBoard } from '@/core/engine/board/board-generator';
import { LobbyState } from '@/lib/types/lobby';
import { PlayerColor } from '@/lib/types/player';
import * as lobbyRepository from '@/lib/repositories/lobby-repository';
import { DEFAULT_TIMER_CONFIG } from '@/lib/types/timer';

const PLAYER_COLORS: PlayerColor[] = ['#ff0000', '#0000ff', '#d4b483', '#ff7a00'];
const LEGACY_COLOR_MAP: Record<string, PlayerColor> = {
    red: '#ff0000',
    blue: '#0000ff',
    orange: '#ff7a00',
    '#ffa500': '#ff7a00',
    '#ff9100': '#ff7a00',
    white: '#d4b483',
    beige: '#d4b483',
};

const normalizeColor = (color: string | null | undefined): PlayerColor => {
    if (!color) return PLAYER_COLORS[0];

    // Standardize casing for comparison
    const normalizedInput = color.toLowerCase();

    if (PLAYER_COLORS.includes(normalizedInput as PlayerColor)) {
        return normalizedInput as PlayerColor;
    }

    const legacy = LEGACY_COLOR_MAP[normalizedInput];
    if (legacy) return legacy;

    return PLAYER_COLORS[0];
};

export class LobbyService {
    /**
     * Ensure all players in a room have valid, unique colors.
     * Assigns defaults when missing or duplicated and persists updates.
     */
    private static async ensurePlayerColors(roomId: string) {
        const roomPlayers = await lobbyRepository.getPlayersByRoomIdOrdered(roomId);

        const availableColors = [...PLAYER_COLORS];
        const updates: Array<{ id: string; color: PlayerColor }> = [];
        const normalizedPlayers = roomPlayers.map(player => {
            const normalizedExisting = normalizeColor(player.color as string | null);
            const hasValidColor = PLAYER_COLORS.includes(normalizedExisting);

            if (hasValidColor && availableColors.includes(normalizedExisting)) {
                availableColors.splice(availableColors.indexOf(normalizedExisting), 1);
                if (normalizedExisting !== player.color) {
                    updates.push({ id: player.id, color: normalizedExisting });
                }
                return { ...player, color: normalizedExisting };
            }

            const assignedColor = availableColors.shift() ?? PLAYER_COLORS[0];

            if (assignedColor !== normalizedExisting || assignedColor !== player.color) {
                updates.push({ id: player.id, color: assignedColor });
            }

            return { ...player, color: assignedColor };
        });

        if (updates.length > 0) {
            await lobbyRepository.updatePlayerColors(updates);
        }

        return normalizedPlayers;
    }

    /**
     * Normalize lobby players by ensuring exactly one host is present.
     * If preferredHostId exists in the room, it becomes the host; otherwise pick the first player.
     */
    private static async normalizeLobbyPlayers(roomId: string, preferredHostId?: string) {
        const colorNormalized = await this.ensurePlayerColors(roomId);

        if (colorNormalized.length === 0) {
            return { players: colorNormalized, hostId: '' };
        }

        const preferredHost = preferredHostId
            ? colorNormalized.find(p => p.id === preferredHostId)
            : null;

        const hostCandidates = colorNormalized.filter(p => p.isHost);
        const canonicalHost = preferredHost ?? hostCandidates[0] ?? colorNormalized[0];
        const hostId = canonicalHost.id;

        const hostUpdates = colorNormalized
            .filter(p => (p.id === hostId && !p.isHost) || (p.id !== hostId && p.isHost))
            .map(p => ({ id: p.id, isHost: p.id === hostId }));

        if (hostUpdates.length > 0) {
            await lobbyRepository.updatePlayerHostFlags(hostUpdates);
        }

        const normalizedPlayers = colorNormalized.map(p => ({
            ...p,
            isHost: p.id === hostId
        }));

        return { players: normalizedPlayers, hostId };
    }

    /**
     * Public helper to fetch players with guaranteed colors assigned.
     */
    static async getPlayersWithColors(roomId: string) {
        const { players } = await this.normalizeLobbyPlayers(roomId);
        return players;
    }

    /**
     * Get the current lobby state for a room
     */
    static async getLobbyState(roomId: string): Promise<LobbyState | null> {
        const room = await lobbyRepository.getRoomById(roomId);

        if (!room || !room.metadata) return null;

        return JSON.parse(room.metadata) as LobbyState;
    }

    /**
     * Update the lobby state in the database
     */
    static async updateLobbyState(roomId: string, state: LobbyState): Promise<void> {
        await lobbyRepository.updateRoomMetadata(roomId, JSON.stringify(state));
    }

    /**
     * Helper to get or initialize lobby state
     */
    private static async getOrInitLobbyState(roomId: string, hostId?: string): Promise<LobbyState> {
        let state = await this.getLobbyState(roomId);
        const { players: dbPlayers, hostId: enforcedHostId } = await this.normalizeLobbyPlayers(
            roomId,
            (state?.hostId || hostId) || undefined
        );

        if (hostId && !dbPlayers.find(p => p.id === hostId)) {
            throw new Error('Host not found in room');
        }

        if (!state) {
            // Initialize state from DB players if it doesn't exist
            // If hostId is provided, ensure they are in the room
            // Find actual host from DB if hostId not provided or just to be safe
            const effectiveHostId = enforcedHostId || hostId || '';

            state = {
                roomId,
                hostId: effectiveHostId,
                players: dbPlayers.map(p => ({
                    id: p.id,
                    name: p.name,
                    color: normalizeColor(p.color as string | null),
                    isHost: p.isHost,
                    isReady: false
                })),
                boardPreview: null,
                fairMode: false, // Default to false
                gameMode: 'base',
                pendingRequests: [],
                timerConfig: DEFAULT_TIMER_CONFIG // Initialize with default timer config
            };

            // Save initial state
            await this.updateLobbyState(roomId, state);
            return state;
        }

        // Keep lobby players in sync with DB (including new joins and color corrections)
        const lobbyPlayers = dbPlayers.map(p => ({
            id: p.id,
            name: p.name,
            color: normalizeColor(p.color as string | null),
            isHost: p.isHost,
            isReady: state?.players.find(sp => sp.id === p.id)?.isReady ?? false
        }));

        const effectiveHostId = enforcedHostId || state.hostId || hostId || '';

        const filteredPendingRequests = state.pendingRequests.filter(id => dbPlayers.some(p => p.id === id));

        const hasPlayerDifferences =
            state.players.length !== lobbyPlayers.length ||
            state.players.some((p, idx) =>
                p.id !== lobbyPlayers[idx]?.id ||
                p.color !== lobbyPlayers[idx]?.color ||
                p.name !== lobbyPlayers[idx]?.name
            );

        const needsUpdate = hasPlayerDifferences || state.hostId !== effectiveHostId || filteredPendingRequests.length !== state.pendingRequests.length;

        if (needsUpdate) {
            state = {
                ...state,
                gameMode: state.gameMode ?? 'base',
                hostId: effectiveHostId,
                players: lobbyPlayers,
                pendingRequests: filteredPendingRequests
            };
            await this.updateLobbyState(roomId, state);
        }

        return state;
    }

    /**
     * Generate a new board for the lobby
     * Only the host can perform this action
     */
    static async generateBoard(roomId: string, hostId: string, fairMode: boolean): Promise<LobbyState> {
        const state = await this.getOrInitLobbyState(roomId, hostId);

        // Verify host
        if (state.hostId !== hostId) {
            throw new Error('Only host can generate board');
        }

        // Generate Board
        const board = generateBoard({ fairMode });

        // Update State
        state.boardPreview = board;
        state.fairMode = fairMode;
        state.pendingRequests = []; // Clear requests

        // Save
        await this.updateLobbyState(roomId, state);

        return state;
    }

    /**
     * Update a player's color selection in the lobby.
     */
    static async setPlayerColor(roomId: string, playerId: string, color: PlayerColor): Promise<LobbyState> {
        const normalizedColor = normalizeColor(color);

        if (!PLAYER_COLORS.includes(normalizedColor)) {
            throw new Error('Invalid color selection');
        }

        const dbPlayers = await this.ensurePlayerColors(roomId);
        const player = dbPlayers.find(p => p.id === playerId);

        if (!player) {
            throw new Error('Player not found in room');
        }

        const colorTaken = dbPlayers.some(p =>
            p.id !== playerId && normalizeColor(p.color as string | null) === normalizedColor
        );
        if (colorTaken) {
            throw new Error('Color already taken');
        }

        await lobbyRepository.setPlayerColor(playerId, normalizedColor);

        const state = await this.getOrInitLobbyState(roomId);
        const updatedPlayers = state.players.map(p => {
            const normalizedExisting = normalizeColor(p.color as string | null);
            return p.id === playerId
                ? { ...p, color: normalizedColor }
                : { ...p, color: normalizedExisting };
        });

        state.players = updatedPlayers;

        await this.updateLobbyState(roomId, state);
        return state;
    }

    /**
     * Player requests a new board
     */
    static async requestNewBoard(roomId: string, playerId: string): Promise<LobbyState> {
        const state = await this.getOrInitLobbyState(roomId);

        if (!state.pendingRequests.includes(playerId)) {
            state.pendingRequests.push(playerId);
            await this.updateLobbyState(roomId, state);
        }

        return state;
    }



    /**
     * Toggle fairness mode
     */
    static async toggleFairMode(roomId: string, hostId: string, fairMode: boolean): Promise<LobbyState> {
        const state = await this.getOrInitLobbyState(roomId, hostId);

        if (state.hostId !== hostId) {
            throw new Error('Only host can toggle fair mode');
        }

        state.fairMode = fairMode;
        await this.updateLobbyState(roomId, state);

        return state;
    }
    /**
     * Set the board to the standard beginner layout
     */
    static async setStandardBoard(roomId: string, hostId: string): Promise<LobbyState> {
        const state = await this.getOrInitLobbyState(roomId, hostId);

        if (state.hostId !== hostId) {
            throw new Error('Only host can set standard board');
        }

        // Import dynamically to avoid circular deps if any
        const { generateStandardBoard } = await import('@/core/engine/board/board-generator');
        const board = generateStandardBoard();

        state.boardPreview = board;
        state.pendingRequests = [];
        await this.updateLobbyState(roomId, state);

        return state;
    }

    /**
     * Set the game mode for the lobby
     */
    static async setGameMode(roomId: string, hostId: string, gameMode: 'base' | 'cities_and_knights'): Promise<LobbyState> {
        // Optimization: Try to use existing state if valid to avoid expensive DB syncs and player fetching
        let state = await this.getLobbyState(roomId);

        if (state && state.hostId === hostId) {
            state.gameMode = gameMode;
            await this.updateLobbyState(roomId, state);
            return state;
        }

        const fullState = await this.getOrInitLobbyState(roomId, hostId);

        if (fullState.hostId !== hostId) {
            throw new Error('Only host can set game mode');
        }

        fullState.gameMode = gameMode;
        await this.updateLobbyState(roomId, fullState);

        return fullState;
    }

    /**
     * Set the timer configuration for the lobby
     */
    static async setTimerConfig(roomId: string, hostId: string, timerConfig: import('@/lib/types/timer').TimerConfig): Promise<LobbyState> {
        // Optimization: Try to use existing state if valid
        let state = await this.getLobbyState(roomId);

        if (state && state.hostId === hostId) {
            state.timerConfig = timerConfig;
            await this.updateLobbyState(roomId, state);
            return state;
        }

        const fullState = await this.getOrInitLobbyState(roomId, hostId);

        if (fullState.hostId !== hostId) {
            throw new Error('Only host can set timer config');
        }

        fullState.timerConfig = timerConfig;
        await this.updateLobbyState(roomId, fullState);

        return fullState;
    }
}
