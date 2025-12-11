'use client';

import React, { useState } from 'react';
import { HexTileData } from '@/core/engine/board/board-generator';
import { HexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { BoardControls } from '@/components/board/BoardControls';

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
                        <BoardControls
                            onZoomIn={() => zoomIn(0.1)}
                            onZoomOut={() => zoomOut(0.1)}
                            is3D={is3D}
                            onToggle3D={() => setIs3D(!is3D)}
                        />

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
