'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

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
    source?: 'robber' | 'wedding' | 'taxation' | 'guild_dues';
    onDismiss: () => void;
}

const isCommodity = (type: ResourceType | CommodityType): type is CommodityType =>
    type === 'paper' || type === 'cloth' || type === 'coin';

const TradeItemIcon: React.FC<{ type: ResourceType | CommodityType; size?: number }> = ({ type, size = 40 }) => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    return isCommodity(type)
        ? <TabletopCommodityIcon type={type} size={size} label={label} />
        : <TabletopResourceIcon type={type} size={size} label={label} />;
};

export const RobberTheftNotification: React.FC<RobberTheftNotificationProps> = ({
    isOpen,
    stolenItem,
    stolenItems,
    wasVictim,
    thiefName,
    victimName,
    source = 'robber',
    onDismiss
}) => {
    // Use stolenItems if provided, otherwise fall back to single stolenItem
    const items = stolenItems && stolenItems.length > 0 ? stolenItems : (stolenItem ? [stolenItem] : []);

    if (!isOpen || items.length === 0) return null;

    // For backward compatibility with single item display
    const primaryItem = items[0];
    const itemName = primaryItem.value.charAt(0).toUpperCase() + primaryItem.value.slice(1);
    const count = primaryItem.count || 1;
    // Calculate total count and build description
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);
    const multipleItems = items.length > 1;
    const isWedding = source === 'wedding';
    const title = isWedding
        ? (wasVictim ? 'Wedding Gift Sent' : 'Wedding Gift Received')
        : (wasVictim ? 'Resources Stolen!' : 'Resources Stolen');

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
                                    const name = item.value.charAt(0).toUpperCase() + item.value.slice(1);
                                    return (
                                        <div key={index} className="flex items-center justify-center gap-3">
                                            <TradeItemIcon type={item.value} />
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
                                <TradeItemIcon type={primaryItem.value} size={48} />
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
                                    <span className="font-semibold text-[var(--ui-accent)]">{victimName}</span> gave you{' '}
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
                                <span className="font-semibold text-[var(--ui-accent)]">{victimName}</span>
                            </>
                        )}
                    </p>

                </div>
        </TabletopModal>
    );
};
