'use client';

import React from 'react';

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
                className="pointer-events-auto bg-slate-900 text-white border border-blue-500/60 rounded-lg shadow-xl px-3 py-3 w-[360px] space-y-3"
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-200 font-semibold">Taxation</div>
                    <p className="text-sm text-slate-200">
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
                    <button
                        className="px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer text-sm"
                        type="button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-3 py-2 rounded-md font-semibold shadow transition-colors text-sm ${
                            hasSelection
                                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                        type="button"
                        onClick={onPlace}
                        disabled={!hasSelection}
                    >
                        Place Robber
                    </button>
                </div>
            </div>
        </div>
    );
};
