'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface RobberTheftNotificationProps {
    isOpen: boolean;
    stolenItem: {
        type: 'resource' | 'commodity';
        value: ResourceType | CommodityType;
        count: number;
    } | null;
    stolenItems?: {
        type: 'resource' | 'commodity';
        value: ResourceType | CommodityType;
        count: number;
    }[];
    wasVictim: boolean; // true if player was stolen from, false if player stole
    thiefName?: string;
    victimName?: string;
    onDismiss: () => void;
}

export const RobberTheftNotification: React.FC<RobberTheftNotificationProps> = ({
    isOpen,
    stolenItem,
    stolenItems,
    wasVictim,
    thiefName,
    victimName,
    onDismiss
}) => {
    // Use stolenItems if provided, otherwise fall back to single stolenItem
    const items = stolenItems && stolenItems.length > 0 ? stolenItems : (stolenItem ? [stolenItem] : []);

    if (!isOpen || items.length === 0) return null;

    // For backward compatibility with single item display
    const primaryItem = items[0];
    const itemName = primaryItem.value.charAt(0).toUpperCase() + primaryItem.value.slice(1);
    const count = primaryItem.count || 1;
    const isPlural = count > 1;

    // Calculate total count and build description
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);
    const multipleItems = items.length > 1;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="relative bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl pointer-events-auto">
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
                        {wasVictim ? (
                            <div className="text-red-400 text-4xl mb-2">⚠️</div>
                        ) : (
                            <div className="text-green-400 text-4xl mb-2">✓</div>
                        )}
                        <h2 className="text-xl font-bold text-white">
                            {wasVictim ? 'Resources Stolen!' : 'Resources Stolen'}
                        </h2>
                    </div>

                    {/* Stolen item display */}
                    <div className="bg-slate-700 rounded-lg p-4 mb-4">
                        {multipleItems ? (
                            <div className="space-y-2">
                                {items.map((item, index) => {
                                    const name = item.value.charAt(0).toUpperCase() + item.value.slice(1);
                                    return (
                                        <div key={index} className="flex items-center justify-center gap-3">
                                            <GameIcon
                                                type={item.value}
                                                size={40}
                                            />
                                            <div className="text-left">
                                                <div className="text-xl font-bold text-white">
                                                    {item.count > 1 && <span className="text-yellow-400">{item.count}x </span>}
                                                    {name}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <GameIcon
                                    type={primaryItem.value}
                                    size={48}
                                />
                                <div className="text-left">
                                    <div className="text-2xl font-bold text-white">
                                        {count > 1 && <span className="text-yellow-400">{count}x </span>}
                                        {itemName}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-slate-300 mb-6">
                        {wasVictim ? (
                            <>
                                <span className="font-semibold text-red-400">{thiefName}</span> stole{' '}
                                <span className="font-semibold">
                                    {multipleItems
                                        ? `${totalCount} cards`
                                        : (count > 1 ? `${count} ${itemName}` : itemName)
                                    }
                                </span> from you
                            </>
                        ) : (
                            <>
                                You stole{' '}
                                <span className="font-semibold">
                                    {multipleItems
                                        ? `${totalCount} cards`
                                        : (count > 1 ? `${count} ${itemName}` : itemName)
                                    }
                                </span>{' '}from{' '}
                                <span className="font-semibold text-yellow-400">{victimName}</span>
                            </>
                        )}
                    </p>

                    {/* OK button */}
                    <button
                        onClick={onDismiss}
                        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
