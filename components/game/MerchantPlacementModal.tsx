'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';

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
                className="pointer-events-auto bg-slate-900 text-white border border-amber-500/60 rounded-lg shadow-xl px-3 py-3 w-[360px] space-y-3"
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-amber-300 font-semibold">Merchant</div>
                    <p className="text-sm text-slate-200">
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
                    <button
                        className="px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer text-sm"
                        type="button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-3 py-2 rounded-md font-semibold shadow transition-colors text-sm ${
                            selectedResource
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                        type="button"
                        onClick={onPlace}
                        disabled={!selectedResource}
                    >
                        Place
                    </button>
                </div>
            </div>
        </div>
    );
};
