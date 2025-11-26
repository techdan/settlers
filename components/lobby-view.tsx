'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startGame } from '@/app/actions';
import { useConnectionStatus, useFetchWithRetry } from '@/lib/hooks/useConnectionStatus';
import { ConnectionStatusIndicator } from '@/components/game/ConnectionStatus';

import { BoardPreview } from './lobby/BoardPreview';
import { GeneratorControls } from './lobby/GeneratorControls';
import { LobbyState } from '@/lib/types/lobby';

type Player = {
    id: string;
    name: string;
    isHost: boolean;
    color: string | null;
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
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [room, setRoom] = useState<Room>(initialRoom);
    const [etag, setEtag] = useState<string | null>(null);
    const router = useRouter();
    const connectionStatus = useConnectionStatus();
    const { fetchWithRetry } = useFetchWithRetry(connectionStatus);

    const isHost = players.find(p => p.id === currentPlayerId)?.isHost ?? false;

    // Parse lobby state from metadata
    const lobbyState: LobbyState | null = room.metadata ? JSON.parse(room.metadata) : null;
    const board = lobbyState?.boardPreview ?? [];
    const fairMode = lobbyState?.fairMode ?? false;
    const pendingRequests = lobbyState?.pendingRequests ?? [];

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const headers: HeadersInit = {};
                if (etag) {
                    headers['If-None-Match'] = etag;
                }

                const data = await fetchWithRetry<{ room: Room; players: Player[] }>(
                    `/api/room/${roomId}`,
                    { headers },
                    {
                        maxRetries: 5,
                        onRetry: (attempt, delay) => {
                            console.log(`Retrying room fetch (attempt ${attempt}, delay ${delay}ms)`);
                        }
                    }
                );

                if (data) {
                    setPlayers(data.players);
                    setRoom(data.room);

                    if (data.room.status === 'in_progress') {
                        router.push(`/board/flat?roomId=${roomId}&playerId=${currentPlayerId}`);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch room after retries", e);
                // Keep showing last known state
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [roomId, currentPlayerId, router, etag, fetchWithRetry]);

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
                        {players.map(player => (
                            <li key={player.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${player.isHost ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                        {player.name} {player.id === currentPlayerId && '(You)'}
                                    </div>
                                    {player.isHost && <div className="text-xs text-amber-600 font-medium">HOST</div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-6 border-t bg-slate-50 dark:bg-slate-950">
                    {isHost ? (
                        <button
                            onClick={() => startGame(roomId)}
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
