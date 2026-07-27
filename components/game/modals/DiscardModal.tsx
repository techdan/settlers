import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { discardCards } from '@/app/actions';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';
import { TabletopButton, TabletopModal } from '../ui/TabletopModal';
import { CARD_LABELS, CardRow, CardToken } from '../ui/CardToken';
import { isCommodity } from '@/lib/trade/bank-ratios';

interface DiscardModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_ORDER: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITY_ORDER: CommodityType[] = ['paper', 'cloth', 'coin'];
const CARD_ORDER = [...RESOURCE_ORDER, ...COMMODITY_ORDER] as const;
type DiscardableCard = typeof CARD_ORDER[number];
const INITIAL_SELECTION: Record<DiscardableCard, number> = {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
    paper: 0,
    cloth: 0,
    coin: 0,
};

function selectionsEqual(a: Record<DiscardableCard, number>, b: Record<DiscardableCard, number>): boolean {
    return CARD_ORDER.every(card => a[card] === b[card]);
}

function normalizeCards(
    resources?: Record<ResourceType, number>,
    commodities?: Record<CommodityType, number>
): Record<DiscardableCard, number> {
    return CARD_ORDER.reduce((acc, card) => {
        const value = isCommodity(card) ? commodities?.[card] : resources?.[card];
        acc[card] = Number.isFinite(value) ? Math.max(0, value as number) : 0;
        return acc;
    }, { ...INITIAL_SELECTION });
}

export const DiscardModal: React.FC<DiscardModalProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [selected, setSelected] = useState<Record<DiscardableCard, number>>(INITIAL_SELECTION);
    const [isPending, startTransition] = useTransition();
    const discardContext = gameState.discardContext;
    const isSabotage = discardContext?.type === 'sabotage';
    const isTarget = isSabotage ? discardContext.targetIds?.includes(playerId) : true;

    const safeCards = React.useMemo(
        () => normalizeCards(player?.resources, player?.commodities),
        [player]
    );

    const totalResources = React.useMemo(
        () => RESOURCE_ORDER.reduce((sum, resource) => sum + safeCards[resource], 0),
        [safeCards]
    );
    const totalCards = React.useMemo(
        () => CARD_ORDER.reduce((sum, card) => sum + safeCards[card], 0),
        [safeCards]
    );
    const discardThreshold = React.useMemo(
        () => (player ? getRobberDiscardThreshold(gameState, playerId) : 7),
        [gameState, player, playerId]
    );
    const requiredDiscard = React.useMemo(() => {
        if (!player) return 0;
        if (!isTarget) return 0;
        if (isSabotage) return Math.max(0, Math.floor(totalResources / 2));
        if (totalCards <= discardThreshold) return 0;
        return Math.max(0, Math.floor(totalCards / 2));
    }, [discardThreshold, isSabotage, isTarget, player, totalCards, totalResources]);

    const availableCards = React.useMemo(
        () => CARD_ORDER.reduce((acc, card) => {
            acc[card] = isSabotage && isCommodity(card) ? 0 : safeCards[card];
            return acc;
        }, { ...INITIAL_SELECTION }),
        [isSabotage, safeCards]
    );

    // Reset/clamp selection whenever discard phase changes or resources update to avoid stale/negative counts.
    React.useEffect(() => {
        if (!player) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        if (gameState.phase !== 'discarding' || player.discardedThisTurn) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        setSelected(prev => {
            const next = { ...prev };
            let changed = false;

            // Clamp to available resources
            CARD_ORDER.forEach(card => {
                const max = availableCards[card];
                if (next[card] > max) {
                    next[card] = max;
                    changed = true;
                }
                if (next[card] < 0) {
                    next[card] = 0;
                    changed = true;
                }
            });

            // Prevent selecting more than required discard after clamping
            const totalSelected = CARD_ORDER.reduce((sum, card) => sum + next[card], 0);
            if (requiredDiscard > 0 && totalSelected > requiredDiscard) {
                let excess = totalSelected - requiredDiscard;
                for (const card of CARD_ORDER) {
                    if (excess === 0) break;
                    const reducible = Math.min(next[card], excess);
                    if (reducible > 0) {
                        next[card] -= reducible;
                        excess -= reducible;
                        changed = true;
                    }
                }
            }

            return changed ? next : prev;
        });
    }, [
        gameState.phase,
        player,
        availableCards,
        requiredDiscard
    ]);

    if (!player || gameState.phase !== 'discarding') return null;

    if (requiredDiscard === 0 || player.discardedThisTurn) {
        // Show waiting message if others are discarding
        return (
            <TabletopModal title="Waiting for Discards">
                <p className="text-center text-[var(--ui-muted)]">Waiting for other players to discard half their cards...</p>
            </TabletopModal>
        );
    }

    const currentSelected = CARD_ORDER.reduce((sum, card) => sum + selected[card], 0);

    const handleIncrement = (card: DiscardableCard) => {
        const max = availableCards[card];
        if (selected[card] < max && currentSelected < requiredDiscard) {
            setSelected(prev => ({ ...prev, [card]: prev[card] + 1 }));
        }
    };

    const handleDecrement = (card: DiscardableCard) => {
        if (selected[card] > 0) {
            setSelected(prev => ({ ...prev, [card]: prev[card] - 1 }));
        }
    };

    const handleConfirm = () => {
        if (currentSelected !== requiredDiscard) return;

        startTransition(async () => {
            try {
                const resources = Object.fromEntries(
                    RESOURCE_ORDER.map(resource => [resource, selected[resource]])
                ) as Record<ResourceType, number>;
                const commodities = Object.fromEntries(
                    COMMODITY_ORDER.map(commodity => [commodity, selected[commodity]])
                ) as Record<CommodityType, number>;
                await discardCards(gameState.roomId, playerId, resources, commodities);
            } catch (e) {
                console.error("Failed to discard", e);
            }
        });
    };

    const heading = isSabotage ? 'Sabotage!' : 'Robber Attack!';

    return (
        <TabletopModal
            title={heading}
            width="lg"
            backdropBlur={false}
            footer={(
                <TabletopButton
                    variant="danger"
                    onClick={handleConfirm}
                    disabled={currentSelected !== requiredDiscard || isPending}
                    className="w-full"
                >
                    {isPending ? 'Discarding...' : 'Confirm Discard'}
                </TabletopButton>
            )}
        >
                <p className="mb-5 text-center text-[var(--ui-muted)]">
                    You have {isSabotage ? totalResources : totalCards} cards. You must discard{' '}
                    <span className="font-bold text-[var(--ui-text)]">{requiredDiscard}</span> cards.
                </p>

                {/* Counts show what survives the discard, so the hand you are left with is
                    the number you read — the same reading as the trade composer. */}
                <CardRow label="Cards to discard" className="mb-5">
                    {CARD_ORDER.map(card => {
                        const max = availableCards[card];
                        if (max === 0) return null;

                        const picked = selected[card];
                        const atLimit = currentSelected >= requiredDiscard;
                        const exhausted = picked === max;

                        return (
                            <CardToken
                                key={card}
                                type={card}
                                count={max - picked}
                                badge={picked > 0 ? `−${picked}` : undefined}
                                badgeTone="bad"
                                selected={picked > 0}
                                disabled={exhausted || atLimit}
                                disabledReason={exhausted
                                    ? `You have no more ${CARD_LABELS[card]} to discard`
                                    : `You have already chosen ${requiredDiscard} cards`}
                                trend={picked > 0 ? 'down' : null}
                                onClick={() => handleIncrement(card)}
                                onRemove={picked > 0 ? () => handleDecrement(card) : undefined}
                                removeLabel={`Keep one ${CARD_LABELS[card]}`}
                                ariaLabel={`Discard one ${CARD_LABELS[card]}, discarding ${picked} of ${max}`}
                            />
                        );
                    })}
                </CardRow>

                <div aria-live="polite" className="text-center text-lg font-bold text-[var(--ui-text)]">
                    Selected:{' '}
                    <span className={currentSelected === requiredDiscard ? 'text-[var(--ui-success)]' : 'text-[var(--ui-accent)]'}>
                        {currentSelected}
                    </span> / {requiredDiscard}
                </div>
        </TabletopModal>
    );
};
