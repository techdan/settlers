import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { endTurn, rollDice, requestTimeExtension } from '@/app/actions';
import { Tooltip } from '@/components/ui/tooltip';
import { ExtensionRequestButton } from './ExtensionRequestButton';
import { PipDie } from '@/themes/tabletop';

/* Tabletop action glyphs — drawn, no icon files (art spec: one language everywhere) */

/** Two tilted mini dice on the brass roll button */
const RollDiceGlyph: React.FC = () => (
    <span className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
        <span className="absolute -translate-x-[7px] -translate-y-[3px] -rotate-12">
            <PipDie value={5} body="#b3352c" pip="#f3e9cf" size={26} />
        </span>
        <span className="absolute translate-x-[8px] translate-y-[5px] rotate-6">
            <PipDie value={2} body="#f3e9cf" pip="#3a3020" size={23} />
        </span>
    </span>
);

/** Exchange arrows for trade */
const TradeGlyph: React.FC = () => (
    <svg viewBox="0 0 28 28" width={30} height={30} aria-hidden="true" fill="none"
        stroke="#3a2c14" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 5 10 H 21 M 21 10 L 16.5 5.5" />
        <path d="M 23 18 H 7 M 7 18 L 11.5 22.5" />
    </svg>
);

/** Passing pennant for end turn */
const EndTurnGlyph: React.FC = () => (
    <svg viewBox="0 0 28 28" width={28} height={28} aria-hidden="true">
        <line x1={8} y1={4} x2={8} y2={25} stroke="#fff1f2" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M 10 5 L 23 8.5 L 10 12 Z" fill="#fff1f2" />
    </svg>
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
                        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-100/70 bg-[var(--ui-accent)] text-[var(--ui-accent-ink)] shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)] disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer p-0 overflow-hidden shadow-inner"
                    >
                        <RollDiceGlyph />
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
                                className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-100/70 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-[var(--ui-accent-ink)] shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)] cursor-pointer p-0 overflow-hidden shadow-inner"
                                aria-label="Open trade menu"
                            >
                                <TradeGlyph />
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
                                className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-red-100/70 bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)] disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer p-0 overflow-hidden shadow-inner"
                            >
                                <EndTurnGlyph />
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
