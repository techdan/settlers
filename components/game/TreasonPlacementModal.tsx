'use client';

import React from 'react';

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
                className="pointer-events-auto bg-slate-900 text-white border border-blue-500/60 rounded-lg shadow-xl px-4 py-4 w-[380px] space-y-3"
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-200 font-semibold">{headingMap[mode]}</div>
                    <p className="text-sm text-slate-200">{descriptionMap[mode]}</p>
                </div>

                {mode === 'select_opponent' && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                            {opponents.map(opp => (
                                <button
                                    key={opp.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                                        selectedOpponentId === opp.id
                                            ? 'border-blue-400 bg-blue-800/60 text-white'
                                            : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100'
                                    } ${opp.hasKnights ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
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
                                        <span className="text-xs text-slate-200">
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
                        <button
                            className="px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer text-sm"
                            type="button"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            className={`px-3 py-2 rounded-md font-semibold shadow transition-colors text-sm ${
                                hasSelection && !disableConfirm
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                            type="button"
                            onClick={onConfirm}
                            disabled={!hasSelection || disableConfirm}
                        >
                            {confirmLabel || 'Confirm'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
