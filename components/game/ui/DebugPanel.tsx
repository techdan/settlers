'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DevCardType, PlayerState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ProgressCardType } from '@/lib/types/player';
import { debugGiveResource, debugGiveCommodity, debugGiveProgressCard, debugGiveDevCard } from '@/app/actions';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

interface DebugPanelProps {
    player: PlayerState;
    roomId: string;
    /** Start expanded. Off by default so the panel stays a small chip until needed. */
    defaultOpen?: boolean;
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

export const DebugPanel: React.FC<DebugPanelProps> = ({ player, roomId, defaultOpen = false }) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isPending, setIsPending] = useState(false);
    const [category, setCategory] = useState<ItemCategory>('resource');
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

    const handleGive = async () => {
        if (!selectedItem) return;

        setIsPending(true);
        setFeedback(null);

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

            setFeedback({ type: 'success', message: `Granted 1 ${selectedItem.replaceAll('_', ' ')}` });
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Debug grant failed';
            console.error('Debug action failed:', error);
            setFeedback({ type: 'error', message });
        } finally {
            setIsPending(false);
        }
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
                    return {
                        value: card,
                        label: `${def.name} (${def.category})`
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

    // Collapsed chrome is tuned to a 36px chip: border-2 (4) + p-1.5 (12) +
    // a 20px header row. Expanded it relaxes back to the roomier p-2.
    return (
        <div className={`pointer-events-auto rounded-lg border-2 border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_14%,var(--ui-panel-solid))] text-[var(--ui-text)] shadow-lg ${isOpen ? 'p-2' : 'h-full p-1.5'}`}>
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                aria-expanded={isOpen}
                className={`flex w-full cursor-pointer items-center rounded py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${isOpen ? 'mb-2 gap-2 px-1' : 'h-full gap-1.5'}`}
            >
                <TabletopStatusIcon type="warning" size={16} />
                <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-[var(--ui-text)]">Debug</span>
                <span aria-hidden className="ml-auto text-[10px] text-[var(--ui-muted)]">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
            <>
            <div className="flex flex-wrap gap-2 items-center">
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="min-h-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-2 py-1 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none disabled:cursor-not-allowed"
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
                    className="min-h-11 min-w-0 flex-1 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-2 py-1 text-sm text-[var(--ui-text)] focus:border-[var(--ui-accent)] focus:outline-none disabled:cursor-not-allowed"
                    disabled={isPending}
                >
                    <option value="">Select item…</option>
                    {getItemsForCategory().map(item => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={handleGive}
                    disabled={isPending || !selectedItem}
                    className="min-h-11 cursor-pointer rounded bg-[var(--ui-danger)] px-3 py-1 text-sm font-semibold text-white transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] disabled:cursor-not-allowed disabled:bg-[var(--ui-panel-raised)] disabled:text-[var(--ui-muted)]"
                >
                    Give
                </button>
            </div>
            {feedback && (
                <div
                    role={feedback.type === 'error' ? 'alert' : 'status'}
                    className={`mt-2 flex items-center gap-2 text-xs ${feedback.type === 'error' ? 'text-[var(--ui-danger)]' : 'text-[var(--ui-success)]'}`}
                >
                    <TabletopStatusIcon type={feedback.type === 'error' ? 'cancel' : 'confirm'} size={14} />
                    <span>{feedback.message}</span>
                </div>
            )}
            </>
            )}
        </div>
    );
};
