import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TradeController } from '@/lib/controllers/trade-controller';
import { GameIcon } from '@/components/ui/icons/GameIcon';

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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-yellow-500/50 p-4 rounded-xl shadow-2xl z-40 animate-in fade-in slide-in-from-top-4">
            <div className="text-center text-yellow-400 font-bold mb-2 text-sm uppercase tracking-wider">
                {isInitiator ? 'Your Active Offer' : `Trade Offer from ${initiatorName}`}
            </div>

            <div className="flex items-center gap-4 justify-center mb-4">
                {/* They Give */}
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 text-center">{isInitiator ? 'You Give' : 'They Give'}</div>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(offer.give).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded">
                                    <div className="flex flex-col items-center leading-none">
                                        <GameIcon type={res as ResourceType} size={28} />
                                        <span className="text-[10px] text-slate-300">{RESOURCE_LABELS[res as ResourceType]}</span>
                                    </div>
                                    <span className="font-bold text-white text-sm">{amount}</span>
                                </div>
                            );
                        })}
                        {offer.giveCommodities && Object.entries(offer.giveCommodities).map(([comm, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={comm} className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded">
                                    <div className="flex flex-col items-center leading-none">
                                        <GameIcon type={comm as CommodityType} size={28} />
                                        <span className="text-[10px] text-slate-300">{COMMODITY_LABELS[comm as CommodityType]}</span>
                                    </div>
                                    <span className="font-bold text-white text-sm">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-slate-500 font-bold">➜</div>

                {/* They Get */}
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 text-center">{isInitiator ? 'You Get' : 'They Want'}</div>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(offer.get).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded">
                                    <div className="flex flex-col items-center leading-none">
                                        <GameIcon type={res as ResourceType} size={28} />
                                        <span className="text-[10px] text-slate-300">{RESOURCE_LABELS[res as ResourceType]}</span>
                                    </div>
                                    <span className="font-bold text-white text-sm">{amount}</span>
                                </div>
                            );
                        })}
                        {offer.getCommodities && Object.entries(offer.getCommodities).map(([comm, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={comm} className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded">
                                    <div className="flex flex-col items-center leading-none">
                                        <GameIcon type={comm as CommodityType} size={28} />
                                        <span className="text-[10px] text-slate-300">{COMMODITY_LABELS[comm as CommodityType]}</span>
                                    </div>
                                    <span className="font-bold text-white text-sm">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-3">
                {isInitiator ? (
                    <button
                        onClick={handleCancel}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Cancelling...' : 'Cancel Offer'}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={handleReject}
                            disabled={isPending}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isPending && pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={!canAfford || isPending}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isPending && pendingAction === 'accept' ? 'Accepting...' : canAfford ? 'Accept Trade' : 'Cannot Afford'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
