'use client';

import React from 'react';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

interface TaxationPlacementModalProps {
    isOpen: boolean;
    status?: string;
    error?: string | null;
    hasSelection: boolean;
    onCancel: () => void;
    onPlace: () => void;
}

export const TaxationPlacementModal: React.FC<TaxationPlacementModalProps> = ({
    isOpen,
    status,
    error,
    hasSelection,
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
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]">Taxation</div>
                    <p className="text-sm text-[var(--ui-muted)]">
                        Click any land hex to move the robber. You will take 1 random resource from each opponent with a settlement or city touching that hex.
                    </p>
                </div>

                {status && (
                    <div className="text-sm font-semibold text-blue-100 bg-blue-900/40 border border-blue-700/60 rounded-md px-3 py-1.5">
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
                    <TabletopButton variant="primary" onClick={onPlace} disabled={!hasSelection}>
                        Place Robber
                    </TabletopButton>
                </div>
            </div>
        </div>
    );
};
