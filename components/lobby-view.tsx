'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical } from 'lucide-react';
import { setLobbyPlayerColor, setLobbyGameMode, setLobbyPlayerOrder, startGame, setLobbyTimerConfig, kickPlayerFromLobby } from '@/app/actions';
import { useConnectionStatus, useFetchWithRetry } from '@/lib/hooks/useConnectionStatus';
import { ConnectionStatusIndicator } from '@/components/game/ui/ConnectionStatus';
import { useLobbySubscription } from '@/lib/hooks/useLobbySubscription';
import {
    DEFAULT_PLAYER_COLOR,
    PLAYER_COLOR_NORMALIZATION_MAP,
    PLAYER_COLOR_OPTIONS,
} from '@/lib/constants/player-colors';

import { BoardPreview } from './lobby/BoardPreview';
import { GeneratorControls } from './lobby/GeneratorControls';
import { TimerConfigPanel } from './lobby/TimerConfigPanel';
import { LobbyState } from '@/lib/types/lobby';
import { PlayerColor } from '@/lib/types/player';
import { DEFAULT_TIMER_CONFIG } from '@/lib/types/timer';
import { formatTime } from '@/lib/services/timer-service';

/**
 * Viewport height below which the settings panel starts collapsed. The panel's
 * tallest state (C&K + timer enabled + custom slider) runs past 500px, which
 * leaves nothing for the player list on a 720p/768p screen.
 */
const SHORT_VIEWPORT_HEIGHT = 800;

function getPlayerOrderFromMetadata(metadata: string | null): string[] | undefined {
    if (!metadata) return undefined;

    try {
        const parsed = JSON.parse(metadata) as LobbyState;
        return Array.isArray(parsed.playerOrder) ? parsed.playerOrder : undefined;
    } catch {
        return undefined;
    }
}

function movePlayerBefore(players: Player[], playerId: string, targetPlayerId: string): Player[] {
    const sourceIndex = players.findIndex(player => player.id === playerId);
    const targetIndex = players.findIndex(player => player.id === targetPlayerId);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return players;
    }

    const nextPlayers = [...players];
    const [movedPlayer] = nextPlayers.splice(sourceIndex, 1);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextPlayers.splice(adjustedTargetIndex, 0, movedPlayer);
    return nextPlayers;
}

function movePlayerToIndex(players: Player[], playerId: string, targetIndex: number): Player[] {
    const sourceIndex = players.findIndex(player => player.id === playerId);
    if (sourceIndex < 0 || sourceIndex === targetIndex || targetIndex < 0 || targetIndex >= players.length) {
        return players;
    }

    const nextPlayers = [...players];
    const [movedPlayer] = nextPlayers.splice(sourceIndex, 1);
    nextPlayers.splice(targetIndex, 0, movedPlayer);
    return nextPlayers;
}

type Player = {
    id: string;
    name: string;
    isHost: boolean;
    color: PlayerColor | null;
    joinedAt?: string | null;
};

type Room = {
    id: string;
    status: string;
    metadata: string | null;
};

export function LobbyView({
    initialRoom,
    initialPlayers,
    roomId,
    currentPlayerId
}: {
    initialRoom: Room,
    initialPlayers: Player[],
    roomId: string,
    currentPlayerId: string
}) {
    const normalizePlayerColor = useCallback((color: PlayerColor | string | null | undefined): PlayerColor => {
        const colorKey = typeof color === 'string' ? color.toLowerCase() : '';
        return PLAYER_COLOR_NORMALIZATION_MAP[colorKey] ?? DEFAULT_PLAYER_COLOR;
    }, []);

    const normalizePlayers = useCallback((list: Player[], playerOrder?: string[]) => {
        const mapped = list.map(p => ({
            ...p,
            color: p.color ? normalizePlayerColor(p.color) : null
        }));

        if (!playerOrder?.length) return mapped;

        const playersById = new Map(mapped.map(player => [player.id, player]));
        const orderedPlayers = playerOrder
            .map(playerId => playersById.get(playerId))
            .filter((player): player is Player => Boolean(player));
        const orderedIds = new Set(orderedPlayers.map(player => player.id));

        return [
            ...orderedPlayers,
            ...mapped.filter(player => !orderedIds.has(player.id)),
        ];
    }, [normalizePlayerColor]);

    const [players, setPlayers] = useState<Player[]>(() => normalizePlayers(
        initialPlayers,
        getPlayerOrderFromMetadata(initialRoom.metadata)
    ));
    const [room, setRoom] = useState<Room>(initialRoom);
    const [gameMode, setGameMode] = useState<'base' | 'cities_and_knights'>('base');
    const [colorError, setColorError] = useState<string | null>(null);
    const [isColorPending, startColorTransition] = useTransition();
    const [kickConfirmation, setKickConfirmation] = useState<{ playerId: string; playerName: string } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
    const [isOrderPending, setIsOrderPending] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const router = useRouter();
    const connectionStatus = useConnectionStatus();
    const { fetchWithRetry } = useFetchWithRetry(connectionStatus);
    const { room: realtimeRoom, players: realtimePlayers, isRealtime } = useLobbySubscription(
        roomId,
        initialRoom,
        initialPlayers
    );
    const fetchWithRetryRef = useRef(fetchWithRetry);

    const isHost = players.find(p => p.id === currentPlayerId)?.isHost ?? false;

    // Parse lobby state from metadata
    const lobbyState: LobbyState | null = room.metadata ? JSON.parse(room.metadata) : null;
    const board = lobbyState?.boardPreview ?? [];
    const fairMode = lobbyState?.fairMode ?? false;
    const syncedGameMode = lobbyState?.gameMode ?? 'base';
    const pendingRequests = lobbyState?.pendingRequests ?? [];
    const timerConfig = lobbyState?.timerConfig ?? DEFAULT_TIMER_CONFIG;
    const syncedSkipFirstBarbarianAttack = lobbyState?.skipFirstBarbarianAttack ?? false;

    useEffect(() => {
        setGameMode(syncedGameMode);
    }, [syncedGameMode]);

    // Start the settings panel collapsed on short viewports so the player list
    // stays readable. Mount-only on purpose: once someone toggles it we stop
    // second-guessing them on resize.
    useEffect(() => {
        if (window.innerHeight < SHORT_VIEWPORT_HEIGHT) {
            setIsSettingsOpen(false);
        }
    }, []);

    // Optimistic local state for the skip-first-attack toggle: without realtime,
    // the lobby polls every 5s, so waiting for the server echo makes the switch
    // feel broken. Same pattern as gameMode above.
    const [skipFirstBarbarianAttack, setSkipFirstBarbarianAttack] = useState(false);
    useEffect(() => {
        setSkipFirstBarbarianAttack(syncedSkipFirstBarbarianAttack);
    }, [syncedSkipFirstBarbarianAttack]);

    const handleSkipFirstAttackToggle = async () => {
        if (!isHost) return;
        const next = !skipFirstBarbarianAttack;
        setSkipFirstBarbarianAttack(next);
        try {
            const { toggleLobbySkipFirstBarbarianAttack } = await import('@/app/actions');
            await toggleLobbySkipFirstBarbarianAttack(roomId, currentPlayerId, next);
        } catch (e) {
            console.error('Failed to toggle skip-first-attack', e);
            setSkipFirstBarbarianAttack(!next);
        }
    };

    const handleGameModeChange = async (mode: 'base' | 'cities_and_knights') => {
        setGameMode(mode); // Optimistic update
        if (isHost) {
            await setLobbyGameMode(roomId, currentPlayerId, mode);
        }
    };

    const handleTimerConfigChange = async (newConfig: typeof DEFAULT_TIMER_CONFIG) => {
        if (isHost) {
            await setLobbyTimerConfig(roomId, currentPlayerId, newConfig);
        }
    };

    useEffect(() => {
        fetchWithRetryRef.current = fetchWithRetry;
    }, [fetchWithRetry]);

    const playersEqual = useCallback((a: Player[], b: Player[]) => {
        if (a.length !== b.length) return false;
        return a.every((p, idx) =>
            p.id === b[idx].id &&
            p.name === b[idx].name &&
            p.isHost === b[idx].isHost &&
            p.color === b[idx].color &&
            p.joinedAt === b[idx].joinedAt
        );
    }, []);

    const roomsEqual = useCallback((a: Room, b: Room) =>
        a.id === b.id && a.status === b.status && a.metadata === b.metadata, []);

    // Supabase realtime flow
    useEffect(() => {
        if (!isRealtime) return;

        const normalizedRealtimePlayers = normalizePlayers(
            realtimePlayers,
            getPlayerOrderFromMetadata(realtimeRoom.metadata)
        );

        setPlayers(prev => playersEqual(prev, normalizedRealtimePlayers) ? prev : normalizedRealtimePlayers);
        setRoom(prev => roomsEqual(prev, realtimeRoom) ? prev : realtimeRoom);

        if (realtimeRoom.status === 'in_progress') {
            router.push(`/board/flat?roomId=${roomId}&playerId=${currentPlayerId}`);
        }
    }, [isRealtime, realtimePlayers, realtimeRoom, normalizePlayers, playersEqual, roomsEqual, router, roomId, currentPlayerId]);

    // Polling fallback when realtime is unavailable
    useEffect(() => {
        if (isRealtime) return;

        let cancelled = false;

        const fetchRoom = async () => {
            try {
                const data = await fetchWithRetryRef.current<{ room: Room; players: Player[] }>(
                    `/api/room/${roomId}`,
                    {},
                    {
                        maxRetries: 5,
                        onRetry: () => { }
                    }
                );

                if (!data || cancelled) return;

                const normalizedPlayers = normalizePlayers(
                    data.players,
                    getPlayerOrderFromMetadata(data.room.metadata)
                );
                setPlayers(prev => playersEqual(prev, normalizedPlayers) ? prev : normalizedPlayers);
                setRoom(prev => roomsEqual(prev, data.room) ? prev : data.room);

                if (data.room.status === 'in_progress') {
                    router.push(`/board/flat?roomId=${roomId}&playerId=${currentPlayerId}`);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error("Failed to fetch room after retries", e);
                }
                // Keep showing last known state
            }
        };

        fetchRoom();
        const interval = setInterval(fetchRoom, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isRealtime, roomId, currentPlayerId, router, normalizePlayers, playersEqual, roomsEqual]);

    const colorOptions = PLAYER_COLOR_OPTIONS;

    // Shown under the header when collapsed so the settings are still legible
    // at a glance without expanding the panel.
    const settingsSummary = [
        gameMode === 'base' ? 'Base Game' : 'Cities & Knights',
        timerConfig.enabled ? `Timer ${formatTime(timerConfig.turnTimeLimit)}` : 'No timer',
        ...(gameMode === 'cities_and_knights' && skipFirstBarbarianAttack ? ['Skip 1st attack'] : []),
    ].join(' · ');

    const handleColorChange = (playerId: string, color: PlayerColor) => {
        setColorError(null);
        startColorTransition(async () => {
            try {
                await setLobbyPlayerColor(roomId, playerId, color);
                setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, color } : p));
            } catch (err) {
                setColorError(err instanceof Error ? err.message : 'Failed to update color');
            }
        });
    };

    const handleKickPlayer = async (playerIdToKick: string) => {
        if (!isHost) return;

        try {
            await kickPlayerFromLobby(roomId, currentPlayerId, playerIdToKick);
            setKickConfirmation(null);
            // Player will be removed via realtime subscription or next poll
        } catch (err) {
            console.error('Failed to kick player:', err);
            setKickConfirmation(null);
        }
    };

    const persistPlayerOrder = useCallback(async (nextPlayers: Player[], previousPlayers: Player[]) => {
        setPlayers(nextPlayers);
        setOrderError(null);
        setIsOrderPending(true);

        try {
            await setLobbyPlayerOrder(roomId, currentPlayerId, nextPlayers.map(player => player.id));
        } catch (err) {
            console.error('Failed to update player order:', err);
            setPlayers(previousPlayers);
            setOrderError(err instanceof Error ? err.message : 'Failed to update player order');
        } finally {
            setIsOrderPending(false);
        }
    }, [currentPlayerId, roomId]);

    const handlePlayerMove = useCallback((playerId: string, targetIndex: number) => {
        if (!isHost || isOrderPending) return;

        const nextPlayers = movePlayerToIndex(players, playerId, targetIndex);
        if (nextPlayers === players) return;

        void persistPlayerOrder(nextPlayers, players);
    }, [isHost, isOrderPending, persistPlayerOrder, players]);

    const handlePlayerDrop = useCallback((playerId: string, targetPlayerId: string) => {
        if (!isHost || isOrderPending || playerId === targetPlayerId) return;

        const nextPlayers = movePlayerBefore(players, playerId, targetPlayerId);
        if (nextPlayers === players) return;

        void persistPlayerOrder(nextPlayers, players);
    }, [isHost, isOrderPending, persistPlayerOrder, players]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Connection Status Indicator */}
            <div className="absolute top-4 right-4 z-50">
                <ConnectionStatusIndicator
                    status={connectionStatus.status}
                    consecutiveFailures={connectionStatus.consecutiveFailures}
                    lastError={connectionStatus.lastError}
                />
            </div>

            {/* Left Sidebar: Players & Room Info */}
            <div className="w-80 flex-shrink-0 flex flex-col border-r bg-white dark:bg-slate-900 shadow-xl z-10">
                <div className="p-6 border-b">
                    <h1 className="text-3xl font-bold mb-2">Lobby</h1>
                    <div className="text-lg text-slate-600 dark:text-slate-400">
                        Room: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{roomId}</span>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                        <span>Players</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{players.length}/4</span>
                    </h2>
                    {isHost && (
                        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                            Drag players to set the turn order.
                        </p>
                    )}
                    <ul className="space-y-3">
                        {players.map((player, playerIndex) => {
                            const isSelf = player.id === currentPlayerId;
                            const takenColors = new Set(
                                players
                                    .filter(p => p.id !== player.id && p.color)
                                    .map(p => p.color as PlayerColor)
                            );

                            return (
                                <li
                                    key={player.id}
                                    onDragOver={(event) => {
                                        if (!isHost || isOrderPending) return;
                                        event.preventDefault();
                                        if (event.dataTransfer) {
                                            event.dataTransfer.dropEffect = 'move';
                                        }
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        const sourcePlayerId = event.dataTransfer?.getData('text/plain') || draggedPlayerId;
                                        if (sourcePlayerId) handlePlayerDrop(sourcePlayerId, player.id);
                                        setDraggedPlayerId(null);
                                    }}
                                    className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 transition-opacity ${draggedPlayerId === player.id ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isHost && (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    draggable={!isOrderPending}
                                                    disabled={isOrderPending}
                                                    onDragStart={(event) => {
                                                        event.dataTransfer.effectAllowed = 'move';
                                                        event.dataTransfer.setData('text/plain', player.id);
                                                        setDraggedPlayerId(player.id);
                                                    }}
                                                    onDragEnd={() => setDraggedPlayerId(null)}
                                                    className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-200 disabled:cursor-not-allowed"
                                                    aria-label={`Drag ${player.name} to reorder`}
                                                    title={`Drag ${player.name} to reorder`}
                                                >
                                                    <GripVertical className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                                <div className="flex gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePlayerMove(player.id, playerIndex - 1)}
                                                        disabled={isOrderPending || playerIndex === 0}
                                                        className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                                        aria-label={`Move ${player.name} up`}
                                                        title={`Move ${player.name} up`}
                                                    >
                                                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePlayerMove(player.id, playerIndex + 1)}
                                                        disabled={isOrderPending || playerIndex === players.length - 1}
                                                        className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                                        aria-label={`Move ${player.name} down`}
                                                        title={`Move ${player.name} down`}
                                                    >
                                                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${player.isHost ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {player.name} {isSelf && '(You)'}
                                            </div>
                                            {player.isHost && <div className="text-xs text-amber-600 font-medium">HOST</div>}
                                        </div>
                                        {isHost && !player.isHost && (
                                            <button
                                                type="button"
                                                onClick={() => setKickConfirmation({ playerId: player.id, playerName: player.name })}
                                                className="cursor-pointer px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                                                title={`Kick ${player.name}`}
                                            >
                                                Kick
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Color</span>
                                        <div className="flex items-center gap-2">
                                            {colorOptions.map(option => {
                                                const isSelected = player.color === option.value;
                                                const isLocked = !isSelf || takenColors.has(option.value) || isColorPending;
                                                const shouldDim = isLocked && !isSelected;
                                                const interactionClass = shouldDim
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : isLocked
                                                        ? 'cursor-not-allowed'
                                                        : 'cursor-pointer hover:scale-105';
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected || isLocked) return;
                                                            handleColorChange(player.id, option.value);
                                                        }}
                                                        disabled={isLocked}
                                                        aria-pressed={isSelected}
                                                        title={
                                                            isSelected
                                                                ? `${option.label} selected`
                                                                : takenColors.has(option.value)
                                                                    ? `${option.label} already taken`
                                                                    : isSelf
                                                                        ? `Switch to ${option.label}`
                                                                        : 'Only the player can change their color'
                                                        }
                                                        className={`w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 transition-all duration-150 ${isSelected
                                                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-800'
                                                            : 'ring-0'
                                                            } ${interactionClass
                                                            }`}
                                                        style={{ backgroundColor: option.swatch }}
                                                    >
                                                        <span className="sr-only">{option.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {isSelf && colorError && (
                                        <div className="mt-2 text-xs text-red-600">
                                            {colorError}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {orderError && (
                        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
                            {orderError}
                        </p>
                    )}
                </div>

                <div className="flex-shrink-0 border-t bg-slate-50 dark:bg-slate-950">
                    {/* Collapsible header - keeps the tall settings block from
                        squeezing the player list on short screens */}
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(open => !open)}
                        aria-expanded={isSettingsOpen}
                        aria-controls="lobby-game-settings"
                        className="w-full flex items-center justify-between gap-3 px-6 py-3 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    >
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Game Settings
                            </span>
                            {!isSettingsOpen && (
                                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {settingsSummary}
                                </span>
                            )}
                        </span>
                        <ChevronDown
                            className={`w-4 h-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        />
                    </button>

                    {/* Expanded content is capped so it can never crowd out the
                        player list, even on a host's tall settings panel */}
                    <div
                        id="lobby-game-settings"
                        hidden={!isSettingsOpen}
                        className="max-h-[40vh] overflow-y-auto px-6 pb-4 space-y-4"
                    >
                        {/* Game Mode Selection - Visible to all, editable by host */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Game Mode {isHost ? '(Host)' : '(Selected by Host)'}
                            </label>
                            {isHost ? (
                                <select
                                    value={gameMode}
                                    onChange={(e) => handleGameModeChange(e.target.value as 'base' | 'cities_and_knights')}
                                    className="w-full cursor-pointer px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                >
                                    <option value="base">Base Game (10 VP)</option>
                                    <option value="cities_and_knights">Cities & Knights (13 VP)</option>
                                </select>
                            ) : (
                                <div className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-medium cursor-not-allowed opacity-90">
                                    {gameMode === 'base' ? 'Base Game (10 VP)' : 'Cities & Knights (13 VP)'}
                                </div>
                            )}
                            {gameMode === 'cities_and_knights' && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 animate-fadeIn">
                                    Adds commodities, city improvements, knights, barbarian attacks, progress cards, and metropolises.
                                </p>
                            )}
                        </div>

                        {/* Skip First Barbarian Attack Toggle (C&K only) */}
                        {gameMode === 'cities_and_knights' && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Skip First Barbarian Attack
                                </label>
                                <button
                                    onClick={handleSkipFirstAttackToggle}
                                    disabled={!isHost}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                        skipFirstBarbarianAttack ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'
                                    }`}
                                    role="switch"
                                    aria-checked={skipFirstBarbarianAttack}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            skipFirstBarbarianAttack ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        )}

                        {/* Timer Configuration */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                            <TimerConfigPanel
                                config={timerConfig}
                                isHost={isHost}
                                onChange={handleTimerConfigChange}
                            />
                        </div>
                    </div>

                    {/* Primary action stays outside the collapsible region so it
                        is never hidden behind the toggle */}
                    <div className="px-6 pb-6 pt-3 border-t border-slate-200 dark:border-slate-800">
                        {isHost ? (
                            <button
                                onClick={() => startGame(roomId, gameMode)}
                                className="w-full bg-green-600 text-white px-6 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-green-500/20 btn-interactive"
                            >
                                Start Game
                            </button>
                        ) : (
                            <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 animate-pulse">
                                Waiting for host to start {gameMode === 'base' ? 'Base Game' : 'Cities & Knights'}...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Area: Board Preview & Controls */}
            <div className="flex-1 flex flex-col relative bg-slate-100 dark:bg-slate-950">
                {/* Board Preview - Fills available space */}
                <div className="flex-1 relative overflow-hidden">
                    <BoardPreview board={board} />
                </div>

                {/* Bottom Controls Bar */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-20">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4">
                        <GeneratorControls
                            roomId={roomId}
                            hostId={players.find(p => p.isHost)?.id ?? ''}
                            currentPlayerId={currentPlayerId}
                            isHost={isHost}
                            fairMode={fairMode}
                            pendingRequests={pendingRequests}
                            players={players}
                        />
                    </div>
                </div>
            </div>

            {/* Kick Confirmation Modal */}
            {kickConfirmation && (
                <div className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setKickConfirmation(null)}>
                    <div className="cursor-default bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Kick Player</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            Are you sure you want to kick <span className="font-semibold text-slate-900 dark:text-white">{kickConfirmation.playerName}</span> from the lobby?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setKickConfirmation(null)}
                                className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKickPlayer(kickConfirmation.playerId)}
                                className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Kick Player
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
