'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

interface MerchantPlacementModalProps {
    isOpen: boolean;
    selectedResource?: ResourceType | null;
    status?: string;
    error?: string | null;
    onCancel: () => void;
    onPlace: () => void;
}

export const MerchantPlacementModal: React.FC<MerchantPlacementModalProps> = ({
    isOpen,
    selectedResource,
    status,
    error,
    onCancel,
    onPlace
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
                className="pointer-events-auto w-[360px] space-y-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] px-3 py-3 text-[var(--ui-text)] shadow-xl"
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]">Merchant</div>
                    <p className="text-sm text-[var(--ui-muted)]">
                        Click a resource hex touching your settlement or city to place the Merchant. While you control it, gain +1 VP and 2:1 trades for that resource.
                    </p>
                </div>

                {status && (
                    <div className="text-sm font-semibold text-emerald-200 bg-emerald-900/30 border border-emerald-700/60 rounded-md px-3 py-1.5">
                        {status}
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-200 bg-red-900/50 border border-red-700 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                    <TabletopButton onClick={onCancel}>Cancel</TabletopButton>
                    <TabletopButton variant="primary" onClick={onPlace} disabled={!selectedResource}>
                        Place
                    </TabletopButton>
                </div>
            </div>
        </div>
    );
};
