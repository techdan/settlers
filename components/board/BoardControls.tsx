'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Box, Layers } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface BoardControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    is3D: boolean;
    onToggle3D: () => void;
    className?: string;
}

export function BoardControls({
    onZoomIn,
    onZoomOut,
    is3D,
    onToggle3D,
    className = ''
}: BoardControlsProps) {
    return (
        <div className={`absolute top-4 left-4 z-10 pointer-events-auto flex items-center gap-1 ${className}`}>
            <Tooltip content="Zoom Out" placement="bottom">
                <button
                    onClick={onZoomOut}
                    className="bg-slate-800/90 text-white w-9 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 flex items-center justify-center cursor-pointer"
                    aria-label="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
            </Tooltip>

            <Tooltip content="Zoom In" placement="bottom">
                <button
                    onClick={onZoomIn}
                    className="bg-slate-800/90 text-white w-9 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 flex items-center justify-center cursor-pointer"
                    aria-label="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
            </Tooltip>

            <Tooltip
                content={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
                placement="bottom"
            >
                <button
                    onClick={onToggle3D}
                    className="bg-slate-800/90 text-white w-9 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 flex items-center justify-center cursor-pointer"
                    aria-label={is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
                >
                    {is3D ? <Layers size={18} /> : <Box size={18} />}
                </button>
            </Tooltip>
        </div>
    );
}
