'use client';

import React, { useMemo } from 'react';
import { HexTileData } from '@/core/engine/board/board-generator';
import { HexTile, Port } from '@/themes/tabletop';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { BoardControls } from '@/components/board/BoardControls';
import { generatePorts } from '@/core/engine/board/port-generator';
import { hexToPixel } from '@/lib/hex';

interface BoardPreviewProps {
    board: HexTileData[];
}

export function BoardPreview({ board }: BoardPreviewProps) {
    if (!board || board.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No board generated yet</p>
            </div>
        );
    }

    const HEX_SIZE = 60;

    const ports = useMemo(() => generatePorts(HEX_SIZE), [HEX_SIZE]);

    const viewBox = useMemo(() => {
        // Include ports + port endpoints so connection lines never clip.
        const points: Array<{ x: number; y: number }> = [];

        for (const tile of board) {
            points.push(hexToPixel(tile.hex, HEX_SIZE));
        }

        for (const port of ports) {
            points.push(port.position);
            if (port.vertices) {
                points.push(...port.vertices);
            }
        }

        if (points.length === 0) return '-450 -450 900 900';

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        // Padding for tile geometry, plus some breathing room.
        // Use minimal top padding to position board near top of view
        const sidePadding = HEX_SIZE * 3;
        const topPadding = HEX_SIZE * 0.5; // Minimal top padding (~30px)
        const bottomPadding = HEX_SIZE * 3;

        const x = minX - sidePadding;
        const y = minY - topPadding;
        const width = (maxX - minX) + sidePadding * 2;
        const height = (maxY - minY) + topPadding + bottomPadding;

        return `${x} ${y} ${width} ${height}`;
    }, [board, ports]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative cursor-grab active:cursor-grabbing">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={false}
                initialPositionX={0}
                initialPositionY={30}
                wheel={{ step: 0.1 }}
                panning={{ disabled: false, velocityDisabled: true }}
                limitToBounds={false}
                alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <BoardControls
                            onZoomIn={() => zoomIn(0.1)}
                            onZoomOut={() => zoomOut(0.1)}
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
                                viewBox={viewBox}
                                preserveAspectRatio="xMidYMin meet"
                                className="overflow-visible"
                            >
                                <g transform="translate(0,0)">
                                    {board.map((tile) => (
                                        <HexTile
                                            key={`${tile.id}-${tile.terrain}-${tile.numberToken}`}
                                            hex={tile.hex}
                                            terrain={tile.terrain}
                                            numberToken={tile.numberToken}
                                            hasRobber={false}
                                            size={HEX_SIZE}
                                        // No interaction in preview
                                        />
                                    ))}

                                    {ports.map((port) => (
                                        <Port key={port.id} port={port} />
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
