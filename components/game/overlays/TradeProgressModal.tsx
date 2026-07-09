'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';
import { TradeOffer, GameState } from '@/lib/types';

interface TradeProgressModalProps {
    gameState: GameState;
    playerId: string;
    onCancel: () => void;
}

const TRADE_ITEM_LABELS: Record<ResourceType | CommodityType, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore',
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin'
};

export const TradeProgressModal: React.FC<TradeProgressModalProps> = ({
    gameState,
    playerId,
    onCancel
}) => {
    const tradeOffer = gameState.tradeOffer;

    // Only show if there's an active trade offer from this player
    if (!tradeOffer || tradeOffer.initiator !== playerId || tradeOffer.status !== 'open') {
        return null;
    }

    // Format items to display
    const formatItems = (
        resources: Record<ResourceType, number>,
        commodities?: Record<CommodityType, number>
    ): { type: ResourceType | CommodityType; count: number }[] => {
        const items: { type: ResourceType | CommodityType; count: number }[] = [];

        // Add resources
        Object.entries(resources).forEach(([type, count]) => {
            if (count > 0) {
                items.push({ type: type as ResourceType, count });
            }
        });

        // Add commodities
        if (commodities) {
            Object.entries(commodities).forEach(([type, count]) => {
                if (count > 0) {
                    items.push({ type: type as CommodityType, count });
                }
            });
        }

        return items;
    };

    const givingItems = formatItems(tradeOffer.give, tradeOffer.giveCommodities);
    const gettingItems = formatItems(tradeOffer.get, tradeOffer.getCommodities);

    // Get list of players and their response status
    const otherPlayers = gameState.players.filter(p => p.id !== playerId);
    const rejectedBy = tradeOffer.rejectedBy || [];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
            <div className="relative bg-slate-800 border-2 border-blue-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                {/* Close X button */}
                <button
                    onClick={onCancel}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
                    aria-label="Cancel trade"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="text-center">
                    {/* Icon and title */}
                    <div className="mb-4">
                        <div className="text-blue-400 text-4xl mb-2">🤝</div>
                        <h2 className="text-xl font-bold text-white">
                            Trade Offer Sent
                        </h2>
                    </div>

                    {/* Trade details */}
                    <div className="bg-slate-700 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* You Give */}
                            <div>
                                <div className="text-xs text-slate-400 uppercase mb-2">You Give</div>
                                <div className="space-y-2">
                                    {givingItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <GameIcon type={item.type} size={24} />
                                            <span className="text-sm text-white">
                                                {item.count}x {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* You Get */}
                            <div>
                                <div className="text-xs text-slate-400 uppercase mb-2">You Get</div>
                                <div className="space-y-2">
                                    {gettingItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <GameIcon type={item.type} size={24} />
                                            <span className="text-sm text-white">
                                                {item.count}x {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Player responses */}
                    <div className="bg-slate-900 rounded-lg p-3 mb-4">
                        <div className="text-xs text-slate-400 uppercase mb-2">Player Responses</div>
                        <div className="space-y-1">
                            {otherPlayers.map(player => {
                                const hasRejected = rejectedBy.includes(player.id);
                                return (
                                    <div key={player.id} className="flex items-center justify-between text-sm">
                                        <span className="text-white">{player.name}</span>
                                        <span className={`text-xs ${hasRejected ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {hasRejected ? 'Rejected' : 'Waiting...'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cancel button */}
                    <button
                        onClick={onCancel}
                        className="w-full py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        Cancel Trade
                    </button>
                </div>
            </div>
        </div>
    );
};
