'use client';

import type { HexTileData } from '@/core/engine/board/board-generator';
import { generatePorts } from '@/core/engine/board/port-generator';
import { BoardControls } from '@/components/board/BoardControls';
import { HexTile, Port, SeaFrame, BOARD_VIEWBOX, TT } from '@/themes/tabletop';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

const HEX_SIZE = 90;
const PORTS = generatePorts(HEX_SIZE);
const BOARD_PAN_MARGIN_PX = 100;
const BOARD_PANNING_OPTIONS = { velocityDisabled: true } as const;
const BOARD_ALIGNMENT_OPTIONS = {
    disabled: true,
    sizeX: BOARD_PAN_MARGIN_PX,
    sizeY: BOARD_PAN_MARGIN_PX,
} as const;

interface BoardPreviewProps {
    board: HexTileData[];
}

export function BoardPreview({ board }: BoardPreviewProps) {
    if (!board || board.length === 0) {
        return <EmptyBoardPreview />;
    }

    return <GeneratedBoardPreview board={board} />;
}

function EmptyBoardPreview() {
    return (
        <div
            data-testid="preview-empty"
            className="relative flex h-full min-h-64 w-full items-center justify-center overflow-hidden"
            style={{ backgroundColor: TT.sea }}
        >
            <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={BOARD_VIEWBOX}
                preserveAspectRatio="xMidYMid slice"
            >
                <SeaFrame />
            </svg>
            <div className="relative mx-6 max-w-sm rounded-2xl border border-[#a98d55]/70 bg-[#f3e9cf]/95 px-8 py-7 text-center text-[#3a3020] shadow-2xl backdrop-blur-sm">
                <p className="font-serif text-xl font-semibold">No board generated yet</p>
                <p className="mt-2 text-sm text-[#6e5b3a]">
                    Generate a board below to preview the island and its harbors.
                </p>
            </div>
        </div>
    );
}

function GeneratedBoardPreview({ board }: BoardPreviewProps) {
    return (
        <div
            className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: TT.sea }}
        >
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={1.3}
                centerOnInit
                limitToBounds
                panning={BOARD_PANNING_OPTIONS}
                alignmentAnimation={BOARD_ALIGNMENT_OPTIONS}
            >
                {({ zoomIn, zoomOut }) => (
                    <>
                        <BoardControls
                            onZoomIn={() => zoomIn(0.1)}
                            onZoomOut={() => zoomOut(0.1)}
                        />

                        <TransformComponent
                            wrapperClass="h-full w-full"
                            contentClass="h-full w-full"
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: '100%', height: '100%' }}
                        >
                            <div className="relative flex h-full w-full items-center justify-center">
                                <svg
                                    aria-label="Generated board preview"
                                    className="overflow-visible"
                                    width="100%"
                                    height="100%"
                                    viewBox={BOARD_VIEWBOX}
                                >
                                    <SeaFrame />

                                    {board.map(tile => (
                                        <HexTile
                                            key={`${tile.id}-${tile.terrain}-${tile.numberToken}`}
                                            hex={tile.hex}
                                            terrain={tile.terrain}
                                            numberToken={tile.numberToken}
                                            hasRobber={false}
                                            size={HEX_SIZE}
                                        />
                                    ))}

                                    {PORTS.map(port => (
                                        <Port key={port.id} port={port} />
                                    ))}
                                </svg>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-[#a98d55]/70 bg-[#f3e9cf]/95 px-3 py-1 text-xs font-semibold tracking-wide text-[#3a3020] shadow-lg backdrop-blur-sm">
                Preview Mode
            </div>
        </div>
    );
}
