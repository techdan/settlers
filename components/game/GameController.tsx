'use client';

import React, { useEffect, useState } from 'react';
import { Board } from '@/components/board/Board';
import { GameState } from '@/lib/game-types';
import { useRouter } from 'next/navigation';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

export const GameController: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch(`/api/game/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    setGameState(data);
                }
            } catch (e) {
                console.error("Failed to fetch game state", e);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 2000);
        return () => clearInterval(interval);
    }, [roomId]);

    if (!gameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    return (
        <div className="relative">
            <Board gameState={gameState} playerId={playerId} />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 bg-black/50 p-4 rounded text-white pointer-events-none">
                <h2 className="text-xl font-bold">Phase: {gameState.phase}</h2>
                <div>Current Turn: {gameState.players.find(p => p.id === gameState.currentTurn)?.name}</div>
                {gameState.currentTurn === playerId && (
                    <div className="text-green-400 font-bold animate-pulse">YOUR TURN</div>
                )}
            </div>
        </div>
    );
};
