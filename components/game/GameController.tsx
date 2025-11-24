'use client';

import React, { useEffect, useState } from 'react';
import { Board } from '@/components/board/Board';
import { GameState } from '@/lib/game-types';
import { useRouter } from 'next/navigation';
import { PlayerHand } from './PlayerHand';
import { GameLog } from './GameLog';
import { PlayerDevCards } from './PlayerDevCards';

import { GameStatus } from './GameStatus';
import { TurnControls } from './TurnControls';
import { DiscardModal } from './DiscardModal';
import { DevCardModal } from './DevCardModal';
import { TradeModal } from './TradeModal';
import { TradeOfferDisplay } from './TradeOfferDisplay';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

export const GameController: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showDevCards, setShowDevCards] = useState(false);
    const [showTrade, setShowTrade] = useState(false);
    const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
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

    const currentPlayer = gameState.players.find(p => p.id === playerId);

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            <Board
                gameState={gameState}
                playerId={playerId}
                buildMode={buildMode}
                onCancelBuild={() => setBuildMode(null)}
            />

            <DiscardModal gameState={gameState} playerId={playerId} />

            {showDevCards && (
                <DevCardModal
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setShowDevCards(false)}
                />
            )}

            {showTrade && (
                <TradeModal
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setShowTrade(false)}
                />
            )}

            <TradeOfferDisplay gameState={gameState} playerId={playerId} />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4">

                {/* Right Sidebar: Status & Log */}
                <div className="absolute top-4 right-4 bottom-4 w-80 flex flex-col gap-4 pointer-events-auto">
                    <GameStatus gameState={gameState} currentPlayerId={playerId} />
                    <div className="flex-1 min-h-0">
                        <GameLog logs={gameState.logs || []} />
                    </div>
                </div>

                {/* Bottom Left: Player Hand & Dev Cards */}
                <div className="absolute bottom-4 left-4 pointer-events-auto flex gap-4 items-end">
                    {currentPlayer && <PlayerHand player={currentPlayer} roomId={roomId} />}
                    <PlayerDevCards gameState={gameState} playerId={playerId} />
                </div>

                {/* Bottom Center: Turn Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <TurnControls
                        gameState={gameState}
                        playerId={playerId}
                        onOpenDevCards={() => setShowDevCards(true)}
                        onOpenTrade={() => setShowTrade(true)}
                        buildMode={buildMode}
                        onSetBuildMode={setBuildMode}
                    />
                </div>
            </div>
        </div>
    );
};
