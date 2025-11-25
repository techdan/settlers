'use client';

import React, { useState } from 'react';
import { HexTileData } from '@/core/engine/board/board-generator';
import { HexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Box, Layers } from 'lucide-react';

interface BoardPreviewProps {
    board: HexTileData[];
}

export function BoardPreview({ board }: BoardPreviewProps) {
    const [is3D, setIs3D] = useState(false);

    if (!board || board.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No board generated yet</p>
            </div>
        );
    }

    // Calculate bounds to center the board
    // Standard board is roughly -2 to 2 in q and r.
    // Hex size 60 is good for preview.
    const HEX_SIZE = 60;
    const TileComponent = is3D ? VoxelHexTile : HexTile;

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setIs3D(!is3D)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-700 dark:text-slate-200"
                                title={is3D ? "Switch to 2D" : "Switch to 3D"}
                            >
                                {is3D ? <Layers size={20} /> : <Box size={20} />}
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                            <button
                                onClick={() => zoomIn()}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-700 dark:text-slate-200"
                                title="Zoom In"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <button
                                onClick={() => zoomOut()}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-700 dark:text-slate-200"
                                title="Zoom Out"
                            >
                                <ZoomOut size={20} />
                            </button>
                        </div>

                        <TransformComponent
                            wrapperClass="w-full h-full"
                            contentClass="w-full h-full flex items-start justify-center"
                            wrapperStyle={{ width: "100%", height: "100%" }}
                            contentStyle={{ width: "100%", height: "100%" }}
                        >
                            <svg
                                width="100%"
                                height="100%"
                                viewBox="-300 -200 600 500"
                                preserveAspectRatio="xMidYMid meet"
                                className="overflow-visible"
                            >
                                <g transform="translate(0,0)">
                                    {board.map((tile) => (
                                        <TileComponent
                                            key={tile.id}
                                            hex={tile.hex}
                                            terrain={tile.terrain}
                                            numberToken={tile.numberToken}
                                            hasRobber={false}
                                            size={HEX_SIZE}
                                        // No interaction in preview
                                        />
                                    ))}
                                </g>
                            </svg>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none backdrop-blur-sm">
                Preview Mode
            </div>
        </div>
    );
}
