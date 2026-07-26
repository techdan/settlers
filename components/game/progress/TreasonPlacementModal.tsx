'use client';

import React from 'react';
import { TabletopButton, tabletopOptionClass } from '@/components/game/ui/TabletopModal';

interface TreasonPlacementModalProps {
    isOpen: boolean;
    mode: 'select_opponent' | 'waiting_for_knight' | 'select_knight' | 'place_knight';
    opponents?: { id: string; name: string; color?: string; knightCount: number; hasKnights: boolean }[];
    selectedOpponentId?: string | null;
    initiatorName?: string;
    status?: string;
    error?: string | null;
    hasSelection?: boolean;
    onSelectOpponent?: (opponentId: string) => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    disableConfirm?: boolean;
}

export const TreasonPlacementModal: React.FC<TreasonPlacementModalProps> = ({
    isOpen,
    mode,
    opponents = [],
    selectedOpponentId,
    initiatorName,
    status,
    error,
    hasSelection,
    onSelectOpponent,
    onConfirm,
    onCancel,
    confirmLabel,
    disableConfirm
}) => {
    if (!isOpen) return null;

    const headingMap: Record<TreasonPlacementModalProps['mode'], string> = {
        select_opponent: 'Treason',
        waiting_for_knight: 'Treason',
        select_knight: 'Treason',
        place_knight: 'Treason'
    };

    const descriptionMap: Record<TreasonPlacementModalProps['mode'], string> = {
        select_opponent: 'Choose a player; they remove a knight. You place a knight of equal strength and status on your road network.',
        waiting_for_knight: 'Waiting for the chosen player to select a knight to remove.',
        select_knight: initiatorName
            ? `${initiatorName} played Treason. Select one of your knights to remove; it will be captured and placed by them with the same strength and active status.`
            : 'Select one of your knights to remove; it will be captured and placed by the Treason player.',
        place_knight: 'Place the captured knight on an intersection connected to your road network.'
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
                className="pointer-events-auto w-[380px] space-y-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] px-4 py-4 text-[var(--ui-text)] shadow-xl"
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]">{headingMap[mode]}</div>
                    <p className="text-sm text-[var(--ui-muted)]">{descriptionMap[mode]}</p>
                </div>

                {mode === 'select_opponent' && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                            {opponents.map(opp => (
                                <button
                                    key={opp.id}
                                    type="button"
                                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${tabletopOptionClass(selectedOpponentId === opp.id, !opp.hasKnights)}`}
                                    onClick={() => onSelectOpponent?.(opp.id)}
                                    disabled={!opp.hasKnights}
                                >
                                    <div className="flex items-center justify-between text-sm font-semibold">
                                        <span className="flex items-center gap-2">
                                            {opp.color && (
                                                <span
                                                    className="inline-block h-3 w-3 rounded-full border border-white/50"
                                                    style={{ backgroundColor: opp.color }}
                                                    aria-hidden
                                                />
                                            )}
                                            {opp.name}
                                        </span>
                                        <span className="text-xs text-[var(--ui-muted)]">
                                            {opp.knightCount} knight{opp.knightCount === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    {!opp.hasKnights && (
                                        <div className="text-xs text-red-200 mt-1">No knights</div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {opponents.length === 0 && (
                            <div className="text-sm text-amber-200 bg-amber-900/30 border border-amber-700/60 rounded-md px-3 py-2">
                                No opponents available.
                            </div>
                        )}
                    </div>
                )}

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
                    {onCancel && (
                        <TabletopButton onClick={onCancel}>Cancel</TabletopButton>
                    )}
                    {onConfirm && (
                        <TabletopButton variant="primary" onClick={onConfirm} disabled={!hasSelection || disableConfirm}>
                            {confirmLabel || 'Confirm'}
                        </TabletopButton>
                    )}
                </div>
            </div>
        </div>
    );
};
