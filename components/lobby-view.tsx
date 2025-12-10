'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLobbyPlayerColor, startGame } from '@/app/actions';
import { useConnectionStatus, useFetchWithRetry } from '@/lib/hooks/useConnectionStatus';
import { ConnectionStatusIndicator } from '@/components/game/ConnectionStatus';
import { useLobbySubscription } from '@/lib/hooks/useLobbySubscription';
import {
    DEFAULT_PLAYER_COLOR,
    PLAYER_COLOR_NORMALIZATION_MAP,
    PLAYER_COLOR_OPTIONS,
    PLAYER_COLOR_VAR_MAP,
} from '@/lib/constants/player-colors';

import { BoardPreview } from './lobby/BoardPreview';
import { GeneratorControls } from './lobby/GeneratorControls';
import { LobbyState } from '@/lib/types/lobby';
import { PlayerColor } from '@/lib/types/player';

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

    const normalizePlayers = useCallback((list: Player[]) => {
        const mapped = list.map(p => ({
            ...p,
            color: p.color ? normalizePlayerColor(p.color) : null
        }));

        // Enforce stable ordering by join time, then id (prevents UI shuffling on updates)
        return mapped.sort((a, b) => {
            const aJoin = a.joinedAt ?? '';
            const bJoin = b.joinedAt ?? '';
            if (aJoin && bJoin && aJoin !== bJoin) {
                return aJoin < bJoin ? -1 : 1;
            }
            if (aJoin && !bJoin) return -1;
            if (!aJoin && bJoin) return 1;
            return a.id.localeCompare(b.id);
        });
    }, [normalizePlayerColor]);

    const [players, setPlayers] = useState<Player[]>(normalizePlayers(initialPlayers));
    const [room, setRoom] = useState<Room>(initialRoom);
    const [gameMode, setGameMode] = useState<'base' | 'cities_and_knights'>('base');
    const [colorError, setColorError] = useState<string | null>(null);
    const [isColorPending, startColorTransition] = useTransition();
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
    const pendingRequests = lobbyState?.pendingRequests ?? [];

    useEffect(() => {
        fetchWithRetryRef.current = fetchWithRetry;
    }, [fetchWithRetry]);

    const playersEqual = useCallback((a: Player[], b: Player[]) => {
        if (a.length !== b.length) return false;
        const sortById = (x: Player, y: Player) => x.id.localeCompare(y.id);
        const sortedA = [...a].sort(sortById);
        const sortedB = [...b].sort(sortById);
        return sortedA.every((p, idx) =>
            p.id === sortedB[idx].id &&
            p.name === sortedB[idx].name &&
            p.isHost === sortedB[idx].isHost &&
            p.color === sortedB[idx].color
        );
    }, []);

    const roomsEqual = useCallback((a: Room, b: Room) =>
        a.id === b.id && a.status === b.status && a.metadata === b.metadata, []);

    // Supabase realtime flow
    useEffect(() => {
        if (!isRealtime) return;

        const normalizedRealtimePlayers = normalizePlayers(realtimePlayers);

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

                const normalizedPlayers = normalizePlayers(data.players);
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

                <div className="flex-1 overflow-y-auto p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                        <span>Players</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{players.length}/4</span>
                    </h2>
                    <ul className="space-y-3">
                        {players.map(player => {
                            const isSelf = player.id === currentPlayerId;
                            const takenColors = new Set(
                                players
                                    .filter(p => p.id !== player.id && p.color)
                                    .map(p => p.color as PlayerColor)
                            );

                            return (
                                <li key={player.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${player.isHost ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {player.name} {isSelf && '(You)'}
                                            </div>
                                            {player.isHost && <div className="text-xs text-amber-600 font-medium">HOST</div>}
                                        </div>
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
                                                        className={`w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 transition-all duration-150 ${
                                                            isSelected
                                                                ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-800'
                                                                : 'ring-0'
                                                        } ${
                                                            interactionClass
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
                </div>

                <div className="p-6 border-t bg-slate-50 dark:bg-slate-950 space-y-4">
                    {isHost && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Game Mode
                            </label>
                            <select
                                value={gameMode}
                                onChange={(e) => setGameMode(e.target.value as 'base' | 'cities_and_knights')}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="base">Base Game (10 VP)</option>
                                <option value="cities_and_knights">Cities & Knights (13 VP)</option>
                            </select>
                            {gameMode === 'cities_and_knights' && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Adds commodities, city improvements, knights, barbarian attacks, progress cards, and metropolises.
                                </p>
                            )}
                        </div>
                    )}

                    {isHost ? (
                        <button
                            onClick={() => startGame(roomId, gameMode)}
                            className="w-full bg-green-600 text-white px-6 py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
                        >
                            Start Game
                        </button>
                    ) : (
                        <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 animate-pulse">
                            Waiting for host...
                        </div>
                    )}
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
        </div>
    );
}
