import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { endTurn, rollDice } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';

interface ActionControlsProps {
    gameState: GameState;
    playerId: string;
    onOpenTrade: () => void;
    onEndTurn?: () => Promise<void> | void;
    turnSubmitted?: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
    gameState,
    playerId,
    onOpenTrade,
    onEndTurn,
    turnSubmitted = false
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
                if (onEndTurn) {
                    await onEndTurn();
                } else {
                    await endTurn(gameState.roomId, playerId);
                }
            } catch (e) {
                console.error("Failed to end turn", e);
            }
        });
    };

    if (!isMyTurn || turnSubmitted) return null;

    // Check for pending Commercial Harbor responses
    const pendingHarborResponses = gameState.pendingCommercialHarbor?.offers.filter(
        o => o.offeredResource !== null && o.response === undefined
    ) || [];
    const pendingCount = pendingHarborResponses.length;
    const canEndTurn = pendingCount === 0;

    // Build list of players waiting for response
    let waitingMessage = '';
    if (!canEndTurn) {
        const waitingPlayers = pendingHarborResponses
            .map(o => gameState.players.find(p => p.id === o.targetPlayerId)?.name)
            .filter(Boolean);
        waitingMessage = `Waiting for ${waitingPlayers.join(', ')} to respond to Commercial Harbor`;
    }

    return (
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
            {gameState.phase === 'waiting_for_roll' && (
                <button
                    onClick={handleRollDice}
                    disabled={isPending}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed"
                >
                    {isPending ? 'Rolling...' : 'Roll Dice 🎲'}
                </button>
            )}

            {gameState.phase === 'main_phase' && (
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={onOpenTrade}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transform transition hover:scale-105 cursor-pointer"
                        >
                            ⚖️ Trade
                        </button>
                        <Tooltip content={waitingMessage || 'End Turn'} placement="top" tooltipClassName="whitespace-pre-line">
                            <button
                                onClick={handleEndTurn}
                                disabled={isPending || !canEndTurn}
                                aria-disabled={!canEndTurn}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isPending ? 'Ending...' : 'End Turn ➡️'}
                            </button>
                        </Tooltip>
                    </div>
                    {!canEndTurn && (
                        <div className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-600/50 rounded px-3 py-2 max-w-xs">
                            ⏳ {waitingMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
