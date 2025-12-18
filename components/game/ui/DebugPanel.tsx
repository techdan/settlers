'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { DevCardType, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ProgressCardType } from '@/lib/types/player';
import { debugGiveResource, debugGiveCommodity, debugGiveProgressCard, debugGiveDevCard } from '@/app/actions';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';

interface DebugPanelProps {
    player: PlayerState;
    roomId: string;
}

type ItemCategory = 'resource' | 'commodity' | 'progress_card' | 'dev_card';

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const COMMODITIES: CommodityType[] = ['paper', 'cloth', 'coin'];
const PROGRESS_CARDS: ProgressCardType[] = Object.keys(PROGRESS_CARD_DEFINITIONS) as ProgressCardType[];
const DEV_CARDS: DevCardType[] = ['knight', 'victory_point', 'road_building', 'year_of_plenty', 'monopoly'];

const DEV_CARD_LABELS: Record<DevCardType, string> = {
    knight: 'Knight',
    victory_point: 'Victory Point',
    road_building: 'Road Building',
    year_of_plenty: 'Year of Plenty',
    monopoly: 'Monopoly',
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ player, roomId }) => {
    const [isPending, startTransition] = useTransition();
    const [category, setCategory] = useState<ItemCategory>('resource');
    const [selectedItem, setSelectedItem] = useState<string>('');

    const hasCommodities = Boolean(player.commodities);
    const hasCitiesAndKnights =
        hasCommodities ||
        Boolean(player.improvements) ||
        Boolean(player.progressCards) ||
        Boolean(player.revealedVPCards) ||
        Boolean(player.knights) ||
        Boolean(player.metropolisOwned);

    const availableCategories = useMemo(() => {
        const categories: { value: ItemCategory; label: string }[] = [{ value: 'resource', label: 'Resource' }];

        if (hasCommodities) {
            categories.push({ value: 'commodity', label: 'Commodity' });
        }

        // Show progress cards for C&K games, otherwise show base dev cards.
        if (hasCitiesAndKnights) {
            categories.push({ value: 'progress_card', label: 'Progress Card' });
        } else {
            categories.push({ value: 'dev_card', label: 'Dev Card' });
        }

        return categories;
    }, [hasCitiesAndKnights, hasCommodities]);

    useEffect(() => {
        if (!availableCategories.some(c => c.value === category)) {
            setCategory(availableCategories[0]?.value ?? 'resource');
        }
    }, [availableCategories, category]);

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
                } else if (category === 'dev_card') {
                    await debugGiveDevCard(roomId, player.id, selectedItem as DevCardType);
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
            case 'dev_card':
                return DEV_CARDS.map(type => ({ value: type, label: DEV_CARD_LABELS[type] }));
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
                    className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-red-400 cursor-pointer"
                    disabled={isPending}
                >
                    {availableCategories.map(c => (
                        <option key={c.value} value={c.value}>
                            {c.label}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-red-400 flex-1 min-w-0 cursor-pointer"
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
                    className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-3 py-1 rounded font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                    Give
                </button>
            </div>
        </div>
    );
};
