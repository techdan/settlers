'use client';

import React from 'react';
import type { InventorSwapEvent } from '@/lib/types';
import type { ResourceType } from '@/core/rules/board-constants';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

interface InventorSwapNotificationProps {
    event: InventorSwapEvent;
    playerName: string;
    onDismiss: () => void;
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore',
};

const formatResourceSquare = (resource: ResourceType) =>
    `${RESOURCE_NAMES[resource]} square`;

export const InventorSwapNotification: React.FC<InventorSwapNotificationProps> = ({
    event,
    playerName,
    onDismiss,
}) => (
    <div aria-live="polite" data-testid="inventor-swap-notification">
        <TabletopModal
            title="Inventor: Resource Squares Swapped"
            description={`${playerName} used Inventor to swap 2 resource squares.`}
            width="sm"
            onClose={onDismiss}
            closeLabel="Close Inventor notification"
            footer={(
                <TabletopButton variant="primary" onClick={onDismiss} className="w-full">
                    OK
                </TabletopButton>
            )}
        >
            <div className="text-center">
                <TabletopStatusIcon
                    type="info"
                    size={40}
                    label="Inventor swap"
                    className="mx-auto mb-4"
                />
                <p className="mb-4 text-sm text-[var(--ui-text)]">
                    The dashed outlines mark the 2 resource squares that changed:
                </p>
                <div className="space-y-2 text-left">
                    {event.hexes.map(hex => (
                        <div
                            key={hex.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2"
                        >
                            <span className="min-w-0 text-sm text-[var(--ui-text)]">
                                {formatResourceSquare(hex.resource)}
                            </span>
                            <span className="flex shrink-0 items-center gap-2 text-lg font-bold tabular-nums">
                                <span className="text-[var(--ui-muted)]">{hex.before}</span>
                                <span className="text-[var(--ui-accent)]" aria-hidden="true">→</span>
                                <span className="text-[var(--ui-success)]">{hex.after}</span>
                            </span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-xs text-[var(--ui-muted)]">
                    The dashed outlines remain on the board until another Inventor swap occurs.
                </p>
            </div>
        </TabletopModal>
    </div>
);
