'use client';

import React, { useState, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { generateStandardBoard, HexTileData } from '@/lib/board-data';
import { useThemeStore } from '@/lib/theme-store';
import { generatePorts } from '@/engine/generatePorts';

export const Board: React.FC = () => {
    const [tiles] = useState<HexTileData[]>(generateStandardBoard());
    const [robberHexId, setRobberHexId] = useState<string | null>(
        tiles.find(t => t.resource === 'desert')?.id || null
    );
    const { theme, toggleTheme } = useThemeStore();

    const HEX_SIZE = 90;

    const ports = useMemo(() => generatePorts(HEX_SIZE), [HEX_SIZE]);

    // Sort tiles for Voxel rendering (Painter's Algorithm: Top -> Bottom)
    // Sort by r (row), then q (col)
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
        return a.hex.q - b.hex.q;
    });

    const TileComponent = theme === 'flat' ? FlatHexTile : VoxelHexTile;
    const PortComponent = theme === 'flat' ? FlatPort : VoxelPort;

    return (
        <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
            <TransformWrapper
                initialScale={1}
                initialPositionX={0}
                initialPositionY={0}
                centerOnInit
                minScale={0.5}
                maxScale={4}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                                <button onClick={() => zoomIn()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold w-10">+</button>
                                <button onClick={() => zoomOut()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold w-10">-</button>
                                <button onClick={() => resetTransform()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold px-4">Reset</button>
                            </div>

                            <button
                                onClick={toggleTheme}
                                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-500 font-bold transition-colors"
                            >
                                Switch to {theme === 'flat' ? 'Voxel' : 'Flat'} Theme
                            </button>
                        </div>

                        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                            <div className="w-full h-full flex items-center justify-center">
                                <svg width="1000" height="1000" viewBox="-500 -500 1000 1000" className="overflow-visible">
                                    <g>
                                        {/* Render Ports first so they are behind tiles if overlapping, or after? 
                        Ports are on the edge. Usually under tiles looks better if they tuck in.
                        But for Voxel, maybe on top?
                        Let's render Ports UNDER tiles for Flat, but maybe check for Voxel.
                    */}
                                        {ports.map(port => (
                                            <PortComponent key={port.id} port={port} />
                                        ))}

                                        {sortedTiles.map((tile) => (
                                            <TileComponent
                                                key={tile.id}
                                                hex={tile.hex}
                                                resource={tile.resource}
                                                numberToken={tile.numberToken}
                                                hasRobber={tile.id === robberHexId}
                                                size={HEX_SIZE}
                                            />
                                        ))}
                                    </g>
                                </svg>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};
