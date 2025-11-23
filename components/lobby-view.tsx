'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startGame } from '@/app/actions';

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
    const router = useRouter();

    const isHost = players.find(p => p.id === currentPlayerId)?.isHost;

    useEffect(() => {
        const interval = setInterval(async () => {
            const res = await fetch(`/api/room/${roomId}`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(data.players);
                setRoom(data.room);

                if (data.room.status === 'playing') {
                    router.push(`/board/flat?roomId=${roomId}&playerId=${currentPlayerId}`);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [roomId, currentPlayerId, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
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
