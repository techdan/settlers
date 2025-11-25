'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startGame } from '@/app/actions';
import { useConnectionStatus, useFetchWithRetry } from '@/lib/hooks/useConnectionStatus';
import { ConnectionStatusIndicator } from '@/components/game/ConnectionStatus';

type Player = {
    id: string;
    name: string;
    isHost: boolean;
    color: string | null;
};

type Room = {
    id: string;
    status: string;
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

    const isHost = players.find(p => p.id === currentPlayerId)?.isHost;

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
        <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
            {/* Connection Status Indicator */}
            <ConnectionStatusIndicator
                status={connectionStatus.status}
                consecutiveFailures={connectionStatus.consecutiveFailures}
                lastError={connectionStatus.lastError}
            />

            <h1 className="text-4xl font-bold">Lobby</h1>
            <div className="text-2xl">Room Code: <span className="font-mono font-bold">{roomId}</span></div>

            <div className="w-full max-w-md border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
                <ul className="space-y-2">
                    {players.map(player => (
                        <li key={player.id} className="flex justify-between items-center p-2 bg-secondary rounded">
                            <span>{player.name} {player.id === currentPlayerId && '(You)'}</span>
                            {player.isHost && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">HOST</span>}
                        </li>
                    ))}
                </ul>
            </div>

            {isHost ? (
                <button
                    onClick={() => startGame(roomId)}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg text-xl font-bold hover:bg-green-700 transition-colors"
                >
                    Start Game
                </button>
            ) : (
                <div className="text-muted-foreground animate-pulse">Waiting for host to start...</div>
            )}
        </div>
    );
}
