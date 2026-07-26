'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

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

const isCommodity = (type: ResourceType | CommodityType): type is CommodityType =>
    type === 'paper' || type === 'cloth' || type === 'coin';

const TradeItemIcon: React.FC<{ type: ResourceType | CommodityType; size?: number }> = ({ type, size = 28 }) =>
    isCommodity(type)
        ? <TabletopCommodityIcon type={type} size={size} label={TRADE_ITEM_LABELS[type]} />
        : <TabletopResourceIcon type={type} size={size} label={TRADE_ITEM_LABELS[type]} />;

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
        <TabletopModal
            title="Trade Complete!"
            description={wasInitiator ? `${partnerName} accepted your trade.` : `Trade completed with ${partnerName}.`}
            onClose={onDismiss}
            closeLabel="Close notification"
            footer={<TabletopButton variant="primary" onClick={onDismiss} className="w-full">OK</TabletopButton>}
        >
                <div className="text-center">
                    <div className="mb-4 flex justify-center">
                        <TabletopStatusIcon type="confirm" size={40} label="Trade completed" />
                    </div>

                    {/* Trade details */}
                    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* You Gave */}
                            <div>
                                <div className="text-xs text-[var(--ui-danger)] uppercase mb-2">You Gave</div>
                                <div className="space-y-2">
                                    {gaveItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 justify-center">
                                            <TradeItemIcon type={item.type} />
                                            <span className="text-sm text-[var(--ui-text)]">
                                                {item.count > 1 && <span className="text-[var(--ui-accent)]">{item.count}x </span>}
                                                {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* You Received */}
                            <div>
                                <div className="text-xs text-[var(--ui-success)] uppercase mb-2">You Received</div>
                                <div className="space-y-2">
                                    {receivedItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 justify-center">
                                            <TradeItemIcon type={item.type} />
                                            <span className="text-sm text-[var(--ui-text)]">
                                                {item.count > 1 && <span className="text-[var(--ui-accent)]">{item.count}x </span>}
                                                {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-[var(--ui-muted)]">
                        {wasInitiator ? (
                            <>
                                <span className="font-semibold text-[var(--ui-success)]">{partnerName}</span> accepted your trade!
                            </>
                        ) : (
                            <>
                                Trade completed with <span className="font-semibold text-[var(--ui-success)]">{partnerName}</span>
                            </>
                        )}
                    </p>

                </div>
        </TabletopModal>
    );
};
