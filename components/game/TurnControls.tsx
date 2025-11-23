import React, { useTransition } from 'react';
import { GameState } from '@/lib/game-types';
import { rollDice, endTurn } from '@/app/actions';

interface TurnControlsProps {
    gameState: GameState;
    playerId: string;
}

export const TurnControls: React.FC<TurnControlsProps> = ({ gameState, playerId }) => {
    const isMyTurn = gameState.currentTurn === playerId;
    const [isPending, startTransition] = useTransition();

    const handleRollDice = () => {
        startTransition(async () => {
            try {
                await rollDice(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to roll dice", e);
            }
        });
    };

    const handleEndTurn = () => {
        startTransition(async () => {
            try {
                await endTurn(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to end turn", e);
            }
        });
    };

    return (
        <div className="flex flex-col items-center gap-4 pointer-events-auto">
            {/* Dice Display */}
            {gameState.diceRoll && (
                <div className="bg-black/60 p-3 rounded-lg text-white flex items-center gap-4 backdrop-blur-sm border border-white/10">
                    <div className="flex gap-2">
                        <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                            {gameState.diceRoll.d1}
                        </div>
                        <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                            {gameState.diceRoll.d2}
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                        {gameState.diceRoll.total}
                    </div>
                </div>
            )}

            {/* Controls */}
            {isMyTurn && (
                <div className="flex gap-2">
                    {gameState.phase === 'waiting_for_roll' && (
                        <button
                            onClick={handleRollDice}
                            disabled={isPending}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            {isPending ? 'Rolling...' : 'Roll Dice 🎲'}
                        </button>
                    )}

                    {gameState.phase === 'main_phase' && (
                        <button
                            onClick={handleEndTurn}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            {isPending ? 'Ending...' : 'End Turn ➡️'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
