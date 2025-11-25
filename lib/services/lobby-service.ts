import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateBoard } from '@/core/engine/board/board-generator';
import { LobbyState } from '@/lib/types/lobby';
import { PlayerColor } from '@/lib/types/player';

export class LobbyService {
    /**
     * Get the current lobby state for a room
     */
    static async getLobbyState(roomId: string): Promise<LobbyState | null> {
        const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, roomId)
        });

        if (!room || !room.metadata) return null;

        return JSON.parse(room.metadata) as LobbyState;
    }

    /**
     * Update the lobby state in the database
     */
    static async updateLobbyState(roomId: string, state: LobbyState): Promise<void> {
        await db.update(rooms)
            .set({ metadata: JSON.stringify(state) })
            .where(eq(rooms.id, roomId));
    }

    /**
     * Helper to get or initialize lobby state
     */
    private static async getOrInitLobbyState(roomId: string, hostId?: string): Promise<LobbyState> {
        let state = await this.getLobbyState(roomId);

        if (!state) {
            // Initialize state from DB players if it doesn't exist
            const dbPlayers = await db.query.players.findMany({
                where: eq(players.roomId, roomId)
            });

            // If hostId is provided, ensure they are in the room
            if (hostId) {
                const hostPlayer = dbPlayers.find(p => p.id === hostId);
                if (!hostPlayer) {
                    throw new Error('Host not found in room');
                }
            }

            // Find actual host from DB if hostId not provided or just to be safe
            const actualHost = dbPlayers.find(p => p.isHost);
            const effectiveHostId = actualHost ? actualHost.id : (hostId || '');

            state = {
                roomId,
                hostId: effectiveHostId,
                players: dbPlayers.map(p => ({
                    id: p.id,
                    name: p.name,
                    color: (p.color as PlayerColor) || 'red',
                    isHost: p.isHost,
                    isReady: false
                })),
                boardPreview: null,
                fairMode: false, // Default to false
                pendingRequests: []
            };

            // Save initial state
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
}
