import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { endTurn, rollDice, requestTimeExtension } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';
import { ColoredSvgIcon } from '@/components/ui/icons/ColoredSvgIcon';
import { ExtensionRequestButton } from './ExtensionRequestButton';

type ActionIconProps = {
    src: string;
    color: string;
    backgroundColor?: string;
    size?: number;
    className?: string;
};

const ActionIcon = ({ src, color, backgroundColor, size = 56, className }: ActionIconProps) => (
    <ColoredSvgIcon
        src={src}
        color={color}
        backgroundColor={backgroundColor}
        size={size}
        className={className}
    />
);

interface ActionControlsProps {
    gameState: GameState;
    playerId: string;
    onOpenTrade: () => void;
    onRollDice?: () => Promise<void> | void;
    onEndTurn?: () => Promise<void> | void;
    turnSubmitted?: boolean;
    hasOptimisticUpdates?: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
    gameState,
    playerId,
    onOpenTrade,
    onRollDice,
    onEndTurn,
    turnSubmitted = false,
    hasOptimisticUpdates = false
}) => {
    const isMyTurn = gameState.currentTurn === playerId;
    const [isPending, startTransition] = useTransition();

    const handleRollDice = () => {
        startTransition(async () => {
            try {
                if (onRollDice) {
                    await onRollDice();
                } else {
                    await rollDice(gameState.roomId, playerId);
                }
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
        <div className="flex flex-col gap-2 items-end pointer-events-none">
            {gameState.phase === 'waiting_for_roll' && (
                <Tooltip content="Roll Dice" placement="top" longPressDelayMs={300}>
                    <button
                        onClick={handleRollDice}
                        disabled={isPending || hasOptimisticUpdates}
                        aria-label="Roll Dice"
                        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-100/70 bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-900 shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer p-0 overflow-hidden shadow-inner"
                    >
                        <ActionIcon
                            src="/icons/rolling-dices.svg"
                            color="var(--color-special-dice)"
                            backgroundColor="#fef08a"
                            size={56}
                            className="h-full w-full rounded-lg"
                        />
                        <span className="sr-only">
                            {isPending ? 'Rolling...' : hasOptimisticUpdates ? 'Waiting...' : 'Roll Dice'}
                        </span>
                    </button>
                </Tooltip>
            )}

            {gameState.phase === 'main_phase' && (
                <div className="flex flex-col gap-2 items-end">
                    <div className="pointer-events-none flex items-center gap-2 justify-end">
                        <Tooltip content="Trade" placement="top" longPressDelayMs={300}>
                            <button
                                onClick={onOpenTrade}
                                className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-100/70 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer p-0 overflow-hidden shadow-inner"
                                aria-label="Open trade menu"
                            >
                                <ActionIcon
                                    src="/icons/trade.svg"
                                    color="#1f2937"
                                    backgroundColor="#fef3c7"
                                    className="h-full w-full rounded-lg"
                                />
                                <span className="sr-only">Trade</span>
                            </button>
                        </Tooltip>

                        {gameState.timerConfig?.enabled && (
                            <ExtensionRequestButton
                                gameState={gameState}
                                playerId={playerId}
                                onRequestExtension={async () => {
                                    await requestTimeExtension(gameState.roomId, playerId);
                                }}
                            />
                        )}

                        <Tooltip
                            content={waitingMessage || 'End Turn'}
                            placement="top"
                            tooltipClassName="whitespace-pre-line"
                            longPressDelayMs={300}
                        >
                            <button
                                onClick={handleEndTurn}
                                disabled={isPending || !canEndTurn}
                                aria-disabled={!canEndTurn}
                                aria-label="End turn"
                                className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-red-100/70 bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer p-0 overflow-hidden shadow-inner"
                            >
                                <ActionIcon
                                    src="/icons/player-next.svg"
                                    color="#fff1f2"
                                    backgroundColor="#7f1d1d"
                                    className="h-full w-full rounded-lg"
                                />
                                <span className="sr-only">
                                    {isPending ? 'Ending turn...' : 'End Turn'}
                                </span>
                            </button>
                        </Tooltip>
                    </div>
                    {!canEndTurn && (
                        <div className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-600/50 rounded px-3 py-2 max-w-xs">
                            {waitingMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
