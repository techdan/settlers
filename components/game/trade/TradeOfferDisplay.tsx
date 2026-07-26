import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TradeController } from '@/lib/controllers/trade-controller';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

interface TradeOfferDisplayProps {
    gameState: GameState;
    playerId: string;
    tradeController: TradeController;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore'
};

const COMMODITY_LABELS: Record<CommodityType, string> = {
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin'
};

export const TradeOfferDisplay: React.FC<TradeOfferDisplayProps> = ({ gameState, playerId, tradeController }) => {
    const [isPending, startTransition] = useTransition();
    const [pendingAction, setPendingAction] = useState<'accept' | 'reject' | null>(null);
    const offer = gameState.tradeOffer;

    if (!offer || offer.status !== 'open') return null;

    const isInitiator = offer.initiator === playerId;
    const hasRejected = offer.rejectedBy?.includes(playerId) ?? false;

    // If this player has already rejected, don't show the trade offer to them
    if (!isInitiator && hasRejected) return null;
    const initiatorName = gameState.players.find(p => p.id === offer.initiator)?.name || 'Unknown';
    const player = gameState.players.find(p => p.id === playerId);

    if (!player) return null;

    // Check if player can afford to accept
    let canAfford = true;
    if (!isInitiator) {
        for (const [res, amount] of Object.entries(offer.get)) {
            if ((player.resources[res as ResourceType] || 0) < amount) {
                canAfford = false;
                break;
            }
        }
        if (offer.getCommodities) {
            for (const [comm, amount] of Object.entries(offer.getCommodities)) {
                if ((player.commodities?.[comm as CommodityType] || 0) < amount) {
                    canAfford = false;
                    break;
                }
            }
        }
    }

    const handleAccept = () => {
        setPendingAction('accept');
        startTransition(async () => {
            try {
                await tradeController.handleAcceptTrade();
            } catch (e) {
                console.error("Failed to accept trade", e);
            } finally {
                setPendingAction(null);
            }
        });
    };

    const handleReject = () => {
        setPendingAction('reject');
        startTransition(async () => {
            try {
                await tradeController.handleRejectTrade();
            } catch (e) {
                console.error("Failed to reject trade", e);
            } finally {
                setPendingAction(null);
            }
        });
    };

    const handleCancel = () => {
        startTransition(async () => {
            try {
                await tradeController.handleCancelTrade();
            } catch (e) {
                console.error("Failed to cancel trade", e);
            }
        });
    };

    return (
        <div className="absolute top-20 left-1/2 z-40 -translate-x-1/2 animate-in rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-4 text-[var(--ui-text)] shadow-2xl backdrop-blur fade-in slide-in-from-top-4">
            <div className="mb-2 flex items-center justify-center gap-2 text-center text-sm font-bold uppercase tracking-wider text-[var(--ui-accent)]">
                <TabletopStatusIcon type="trade" size={18} />
                {isInitiator ? 'Your Active Offer' : `Trade Offer from ${initiatorName}`}
            </div>

            <div className="flex items-center gap-4 justify-center mb-4">
                {/* They Give */}
                <div className="rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-2">
                    <div className="mb-1 text-center text-xs text-[var(--ui-muted)]">{isInitiator ? 'You Give' : 'They Give'}</div>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(offer.give).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-2 rounded bg-[var(--ui-panel-solid)] px-2 py-1">
                                    <div className="flex flex-col items-center leading-none">
                                        <TabletopResourceIcon type={res as ResourceType} size={28} label={RESOURCE_LABELS[res as ResourceType]} />
                                        <span className="text-[10px] text-[var(--ui-muted)]">{RESOURCE_LABELS[res as ResourceType]}</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--ui-text)]">{amount}</span>
                                </div>
                            );
                        })}
                        {offer.giveCommodities && Object.entries(offer.giveCommodities).map(([comm, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={comm} className="flex items-center gap-2 rounded bg-[var(--ui-panel-solid)] px-2 py-1">
                                    <div className="flex flex-col items-center leading-none">
                                        <TabletopCommodityIcon type={comm as CommodityType} size={28} label={COMMODITY_LABELS[comm as CommodityType]} />
                                        <span className="text-[10px] text-[var(--ui-muted)]">{COMMODITY_LABELS[comm as CommodityType]}</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--ui-text)]">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="font-bold text-[var(--ui-muted)]" aria-hidden="true">→</div>

                {/* They Get */}
                <div className="rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-2">
                    <div className="mb-1 text-center text-xs text-[var(--ui-muted)]">{isInitiator ? 'You Get' : 'They Want'}</div>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(offer.get).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-2 rounded bg-[var(--ui-panel-solid)] px-2 py-1">
                                    <div className="flex flex-col items-center leading-none">
                                        <TabletopResourceIcon type={res as ResourceType} size={28} label={RESOURCE_LABELS[res as ResourceType]} />
                                        <span className="text-[10px] text-[var(--ui-muted)]">{RESOURCE_LABELS[res as ResourceType]}</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--ui-text)]">{amount}</span>
                                </div>
                            );
                        })}
                        {offer.getCommodities && Object.entries(offer.getCommodities).map(([comm, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={comm} className="flex items-center gap-2 rounded bg-[var(--ui-panel-solid)] px-2 py-1">
                                    <div className="flex flex-col items-center leading-none">
                                        <TabletopCommodityIcon type={comm as CommodityType} size={28} label={COMMODITY_LABELS[comm as CommodityType]} />
                                        <span className="text-[10px] text-[var(--ui-muted)]">{COMMODITY_LABELS[comm as CommodityType]}</span>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--ui-text)]">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-3">
                {isInitiator ? (
                    <TabletopButton
                        onClick={handleCancel}
                        disabled={isPending}
                        variant="danger"
                        className="px-6"
                    >
                        {isPending ? 'Cancelling...' : 'Cancel Offer'}
                    </TabletopButton>
                ) : (
                    <>
                        <TabletopButton
                            onClick={handleReject}
                            disabled={isPending}
                            className="px-5"
                        >
                            {isPending && pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                        </TabletopButton>
                        <TabletopButton
                            onClick={handleAccept}
                            disabled={!canAfford || isPending}
                            variant="primary"
                            className="px-6"
                        >
                            {isPending && pendingAction === 'accept' ? 'Accepting...' : canAfford ? 'Accept Trade' : 'Cannot Afford'}
                        </TabletopButton>
                    </>
                )}
            </div>
        </div>
    );
};
