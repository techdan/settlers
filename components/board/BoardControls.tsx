'use client';

import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface BoardControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    className?: string;
}

export function BoardControls({
    onZoomIn,
    onZoomOut,
    className = ''
}: BoardControlsProps) {
    return (
        <div className={`absolute top-4 left-4 z-10 pointer-events-auto flex items-center gap-1 ${className}`}>
            <Tooltip content="Zoom Out" placement="bottom">
                <button
                    onClick={onZoomOut}
                    className="bg-[var(--ui-panel-solid)]/90 text-[var(--ui-text)] w-9 h-9 rounded shadow-lg hover:bg-[var(--ui-panel-raised)] transition-colors border border-[var(--ui-border)] flex items-center justify-center cursor-pointer"
                    aria-label="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
            </Tooltip>

            <Tooltip content="Zoom In" placement="bottom">
                <button
                    onClick={onZoomIn}
                    className="bg-[var(--ui-panel-solid)]/90 text-[var(--ui-text)] w-9 h-9 rounded shadow-lg hover:bg-[var(--ui-panel-raised)] transition-colors border border-[var(--ui-border)] flex items-center justify-center cursor-pointer"
                    aria-label="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
            </Tooltip>
        </div>
    );
}
