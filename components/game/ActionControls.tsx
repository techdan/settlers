import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { endTurn, rollDice } from '@/app/actions';

interface ActionControlsProps {
    gameState: GameState;
    playerId: string;
    onOpenTrade: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
    gameState,
    playerId,
    onOpenTrade
}) => {
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

    if (!isMyTurn) return null;

    return (
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
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
                <div className="flex gap-2">
                    <button
                        onClick={onOpenTrade}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transform transition hover:scale-105"
                    >
                        ⚖️ Trade
                    </button>
                    <button
                        onClick={handleEndTurn}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        {isPending ? 'Ending...' : 'End Turn ➡️'}
                    </button>
                </div>
            )}
        </div>
    );
};
