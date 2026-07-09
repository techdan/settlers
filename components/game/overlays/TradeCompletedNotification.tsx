'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface TradeCompletedNotificationProps {
    isOpen: boolean;
    wasInitiator: boolean; // true if player initiated the trade, false if player accepted
    partnerName: string;
    gave: {
        resources: Record<ResourceType, number>;
        commodities?: Record<CommodityType, number>;
    };
    received: {
        resources: Record<ResourceType, number>;
        commodities?: Record<CommodityType, number>;
    };
    onDismiss: () => void;
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

export const TradeCompletedNotification: React.FC<TradeCompletedNotificationProps> = ({
    isOpen,
    wasInitiator,
    partnerName,
    gave,
    received,
    onDismiss
}) => {
    if (!isOpen) return null;

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

    const gaveItems = formatItems(gave.resources, gave.commodities);
    const receivedItems = formatItems(received.resources, received.commodities);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="relative bg-slate-800 border-2 border-green-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                {/* Close X button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
                    aria-label="Close notification"
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
                        <div className="text-green-400 text-4xl mb-2">✓</div>
                        <h2 className="text-xl font-bold text-white">
                            Trade Complete!
                        </h2>
                    </div>

                    {/* Trade details */}
                    <div className="bg-slate-700 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* You Gave */}
                            <div>
                                <div className="text-xs text-red-400 uppercase mb-2">You Gave</div>
                                <div className="space-y-2">
                                    {gaveItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 justify-center">
                                            <GameIcon type={item.type} size={28} />
                                            <span className="text-sm text-white">
                                                {item.count > 1 && <span className="text-yellow-400">{item.count}x </span>}
                                                {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* You Received */}
                            <div>
                                <div className="text-xs text-green-400 uppercase mb-2">You Received</div>
                                <div className="space-y-2">
                                    {receivedItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 justify-center">
                                            <GameIcon type={item.type} size={28} />
                                            <span className="text-sm text-white">
                                                {item.count > 1 && <span className="text-yellow-400">{item.count}x </span>}
                                                {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-slate-300 mb-6">
                        {wasInitiator ? (
                            <>
                                <span className="font-semibold text-green-400">{partnerName}</span> accepted your trade!
                            </>
                        ) : (
                            <>
                                Trade completed with <span className="font-semibold text-green-400">{partnerName}</span>
                            </>
                        )}
                    </p>

                    {/* OK button */}
                    <button
                        onClick={onDismiss}
                        className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
