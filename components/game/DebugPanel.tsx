'use client';

import React, { useState, useTransition } from 'react';
import { PlayerState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ProgressCardType } from '@/lib/types/player';
import { debugGiveResource, debugGiveCommodity, debugGiveProgressCard } from '@/app/actions';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';

interface DebugPanelProps {
    player: PlayerState;
    roomId: string;
}

type ItemCategory = 'resource' | 'commodity' | 'progress_card';

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITIES: CommodityType[] = ['paper', 'cloth', 'coin'];
const PROGRESS_CARDS: ProgressCardType[] = Object.keys(PROGRESS_CARD_DEFINITIONS) as ProgressCardType[];

export const DebugPanel: React.FC<DebugPanelProps> = ({ player, roomId }) => {
    const [isPending, startTransition] = useTransition();
    const [category, setCategory] = useState<ItemCategory>('resource');
    const [selectedItem, setSelectedItem] = useState<string>('');

    const handleGive = () => {
        if (!selectedItem) return;

        startTransition(async () => {
            try {
                if (category === 'resource') {
                    await debugGiveResource(roomId, player.id, selectedItem as ResourceType);
                } else if (category === 'commodity') {
                    await debugGiveCommodity(roomId, player.id, selectedItem as CommodityType);
                } else if (category === 'progress_card') {
                    await debugGiveProgressCard(roomId, player.id, selectedItem as ProgressCardType);
                }
            } catch (e) {
                console.error('Debug action failed:', e);
            }
        });
    };

    const getItemsForCategory = (): { value: string; label: string }[] => {
        switch (category) {
            case 'resource':
                return RESOURCES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));
            case 'commodity':
                return COMMODITIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
            case 'progress_card':
                return PROGRESS_CARDS.map(card => {
                    const def = PROGRESS_CARD_DEFINITIONS[card];
                    let icon = '';
                    if (def.category === 'science') icon = '🟢 ';
                    else if (def.category === 'trade') icon = '🟡 ';
                    else if (def.category === 'politics') icon = '🔵 ';

                    return {
                        value: card,
                        label: `${icon}${def.name}`
                    };
                });
            default:
                return [];
        }
    };

    // Reset selected item when category changes
    React.useEffect(() => {
        setSelectedItem('');
    }, [category]);

    return (
        <div className="bg-red-900/90 p-3 rounded-lg shadow-lg text-white border-2 border-red-500 pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-bold text-red-200 uppercase tracking-wider">🔧 Debug</div>
            </div>
            <div className="flex gap-2 items-center">
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-red-400"
                    disabled={isPending}
                >
                    <option value="resource">Resource</option>
                    <option value="commodity">Commodity</option>
                    <option value="progress_card">Progress Card</option>
                </select>

                <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-red-400 flex-1 min-w-0"
                    disabled={isPending}
                >
                    <option value="">Select item...</option>
                    {getItemsForCategory().map(item => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleGive}
                    disabled={isPending || !selectedItem}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-3 py-1 rounded font-semibold transition-colors"
                >
                    Give
                </button>
            </div>
        </div>
    );
};
