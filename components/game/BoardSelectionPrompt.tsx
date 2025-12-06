'use client';

import React, { memo } from 'react';
import { Tooltip } from '@/components/ui/tooltip';

interface BoardSelectionPromptProps {
    title: string;
    description: string;
    status?: string;
    onCancel?: () => void;
    onFinish?: () => void;
    finishLabel?: string;
    finishDisabled?: boolean;
    children?: React.ReactNode;
}

const BoardSelectionPromptComponent: React.FC<BoardSelectionPromptProps> = ({
    title,
    description,
    status,
    onCancel,
    onFinish,
    finishLabel = 'Finish',
    finishDisabled = false,
    children
}) => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-lg">
                <div className="text-sm space-y-1">
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-slate-200">{description}</div>
                    {status && <div className="text-xs text-slate-300">{status}</div>}
                    {children}
                </div>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Tooltip content="Cancel" placement="top">
                            <button
                                type="button"
                                className="px-3 py-2 rounded-md border border-red-700 bg-red-700 hover:bg-red-600 text-white font-semibold transition-colors cursor-pointer"
                                onClick={onCancel}
                            >
                                Cancel
                            </button>
                        </Tooltip>
                    )}
                    {onFinish && (
                        <Tooltip content={finishLabel} placement="top">
                            <button
                                type="button"
                                className={`px-3 py-2 rounded-md font-semibold shadow text-sm transition-colors ${
                                    finishDisabled
                                        ? 'bg-emerald-800 text-white/70 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                }`}
                                onClick={onFinish}
                                disabled={finishDisabled}
                            >
                                {finishLabel}
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BoardSelectionPrompt: React.FC<BoardSelectionPromptProps> = memo(BoardSelectionPromptComponent);
