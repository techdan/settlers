'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { CardTally, cardCountsFrom } from '@/components/game/ui/CardToken';

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

export const TradeCompletedNotification: React.FC<TradeCompletedNotificationProps> = ({
    isOpen,
    wasInitiator,
    partnerName,
    gave,
    received,
    onDismiss
}) => {
    if (!isOpen) return null;

    const gaveCounts = cardCountsFrom(gave.resources, gave.commodities);
    const receivedCounts = cardCountsFrom(received.resources, received.commodities);

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
                            <div>
                                <div className="mb-2 text-xs uppercase text-[var(--ui-danger)]">You Gave</div>
                                <CardTally counts={gaveCounts} />
                            </div>
                            <div>
                                <div className="mb-2 text-xs uppercase text-[var(--ui-success)]">You Received</div>
                                <CardTally counts={receivedCounts} />
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
