'use client';

import React from 'react';
import type { TheftItem, TheftSource } from '@/lib/types/game';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface RobberTheftNotificationProps {
    isOpen: boolean;
    stolenItem: TheftItem | null;
    stolenItems?: TheftItem[];
    wasVictim: boolean; // true if player was stolen from, false if player stole
    thiefName?: string;
    victimNames?: string[];
    source?: TheftSource;
    onDismiss: () => void;
}

const formatItemName = (value: TheftItem['value']) =>
    value
        .replace(/_progress$/, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const TradeItemIcon: React.FC<{ item: TheftItem; size?: number }> = ({ item, size = 40 }) => {
    const label = formatItemName(item.value);
    if (item.type === 'commodity') {
        return <TabletopCommodityIcon type={item.value} size={size} label={label} />;
    }
    if (item.type === 'resource') {
        return <TabletopResourceIcon type={item.value} size={size} label={label} />;
    }
    return <TabletopStatusIcon type="info" size={size} label={`${label} progress card`} />;
};

const SOURCE_TITLES: Partial<Record<TheftSource, { thief: string; victim: string }>> = {
    wedding: { thief: 'Wedding Gift Received', victim: 'Wedding Gift Sent' },
    guild_dues: { thief: 'Guild Dues Collected', victim: 'Guild Dues Taken' },
    taxation: { thief: 'Taxation Collected', victim: 'Taxation Theft' },
    resource_monopoly: { thief: 'Resource Monopoly', victim: 'Resource Monopolized' },
    trade_monopoly: { thief: 'Trade Monopoly', victim: 'Commodity Monopolized' },
    monopoly: { thief: 'Monopoly Collected', victim: 'Resource Monopolized' },
    espionage: { thief: 'Progress Card Stolen', victim: 'Progress Card Stolen!' },
};

export const RobberTheftNotification: React.FC<RobberTheftNotificationProps> = ({
    isOpen,
    stolenItem,
    stolenItems,
    wasVictim,
    thiefName,
    victimNames = [],
    source = 'robber',
    onDismiss
}) => {
    // Use stolenItems if provided, otherwise fall back to single stolenItem
    const items = stolenItems && stolenItems.length > 0 ? stolenItems : (stolenItem ? [stolenItem] : []);

    if (!isOpen || items.length === 0) return null;

    // For backward compatibility with single item display
    const primaryItem = items[0];
    const itemName = formatItemName(primaryItem.value);
    const count = primaryItem.count || 1;
    // Calculate total count and build description
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);
    const multipleItems = items.length > 1;
    const isWedding = source === 'wedding';
    const sourceTitles = SOURCE_TITLES[source];
    const title = sourceTitles
        ? (wasVictim ? sourceTitles.victim : sourceTitles.thief)
        : (wasVictim ? 'Resources Stolen!' : 'Resources Stolen');
    const victimDescription =
        victimNames.length === 0
            ? 'another player'
            : victimNames.length === 1
                ? victimNames[0]
                : `${victimNames.length} players`;

    return (
        <TabletopModal
            title={title}
            onClose={onDismiss}
            closeLabel="Close notification"
            width="sm"
            footer={<TabletopButton variant="primary" onClick={onDismiss} className="w-full">OK</TabletopButton>}
        >
                <div className="text-center">
                    {/* Icon and title */}
                    <div className="mb-4">
                        {wasVictim && !isWedding ? (
                            <TabletopStatusIcon type="warning" size={40} label="Warning" className="mx-auto mb-2" />
                        ) : (
                            <TabletopStatusIcon type="confirm" size={40} label={isWedding ? 'Wedding gift completed' : 'Theft completed'} className="mx-auto mb-2" />
                        )}
                    </div>

                    {/* Stolen item display */}
                    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4 mb-4">
                        {multipleItems ? (
                            <div className="space-y-2">
                                {items.map((item, index) => {
                                    const name = formatItemName(item.value);
                                    return (
                                        <div key={index} className="flex items-center justify-center gap-3">
                                            <TradeItemIcon item={item} />
                                            <div className="text-left">
                                                <div className="text-xl font-bold text-[var(--ui-text)]">
                                                    {item.count > 1 && <span className="text-[var(--ui-accent)]">{item.count}x </span>}
                                                    {name}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <TradeItemIcon item={primaryItem} size={48} />
                                <div className="text-left">
                                    <div className="text-2xl font-bold text-[var(--ui-text)]">
                                        {count > 1 && <span className="text-[var(--ui-accent)]">{count}x </span>}
                                        {itemName}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-[var(--ui-muted)]">
                        {isWedding ? (
                            wasVictim ? (
                                <>
                                    You gave{' '}
                                    <span className="font-semibold">
                                        {multipleItems ? `${totalCount} cards` : (count > 1 ? `${count} ${itemName}` : itemName)}
                                    </span>{' '}to{' '}
                                    <span className="font-semibold text-[var(--ui-accent)]">{thiefName}</span> for Wedding
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold text-[var(--ui-accent)]">{victimDescription}</span> gave you{' '}
                                    <span className="font-semibold">
                                        {multipleItems ? `${totalCount} cards` : (count > 1 ? `${count} ${itemName}` : itemName)}
                                    </span>{' '}for Wedding
                                </>
                            )
                        ) : wasVictim ? (
                            <>
                                <span className="font-semibold text-[var(--ui-danger)]">{thiefName}</span> stole{' '}
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
                                <span className="font-semibold text-[var(--ui-accent)]">{victimDescription}</span>
                            </>
                        )}
                    </p>

                </div>
        </TabletopModal>
    );
};
