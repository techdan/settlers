'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';
import type { HexTileData } from '@/core/engine/board/board-generator';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import { useBoardPresentation } from '@/lib/hooks/useBoardPresentation';
import { PresentationBoundary } from '@/components/board/PresentationBoundary';
import { ClassicBoardPreview } from './ClassicBoardPreview';

const BoardScene = dynamic(() => import('@/components/board/three/BoardScene'), {
    ssr: false,
    loading: () => <div role="status" className="flex h-full items-center justify-center text-[#f3e9cf]">Preparing your island…</div>,
});
const noop = () => {};

export function BoardPreview({ board }: { board: HexTileData[] }) {
    const { mode, setMode } = useBoardPresentation();
    const unavailable = useCallback(() => setMode('classic'), [setMode]);
    // Render the exact generated lobby tiles, with no player pieces or game actions.
    const props = useMemo<BoardRendererProps>(() => ({
        gameState: {
            id: 'lobby-preview', roomId: '', players: [],
            board: { hexes: board, vertices: {}, edges: {} },
            currentTurn: '', turnOrder: [], phase: 'main_phase', gameMode: 'base',
            winner: null, lastPlacedSettlementId: null, robberHexId: null,
            devCardDeck: [], longestRoadOwner: null, longestRoadLength: 0,
            largestArmyOwner: null, logs: [],
        },
        playerId: '', hexSize: 90, selectionState: { buildMode: null },
        validation: { validVertices: new Set(), validEdges: new Set(), validHexes: new Set() },
        vertices: [], renderEdges: [], knightsMap: new Map(),
        pendingPlacement: null, displayedRobberHexId: null,
        onVertexClick: noop, onEdgeClick: noop, onHexClick: noop,
        onConfirmPlacement: noop, onCancelPlacement: noop, onCancelBuild: noop,
    }), [board]);

    if (!board?.length) {
        return <div data-testid="preview-empty" className="flex h-full min-h-64 items-center justify-center bg-[#397c81] p-6 text-center text-[#f3e9cf]">
            <div className="rounded-2xl border border-[#a98d55]/40 bg-[#202c2b]/95 p-7 shadow-xl">
                <p className="font-serif text-xl font-semibold">No board generated yet</p>
                <p className="mt-2 text-sm">Generate a board below to preview the island and its harbors.</p>
            </div>
        </div>;
    }

    return <div className="relative h-full min-h-64 w-full bg-[#397c81]" aria-label="Generated board preview" data-board-presentation={mode}>
        {mode === 'three' ? (
            <PresentationBoundary fallback={<ClassicBoardPreview board={board} />} onUnavailable={unavailable}>
                <BoardScene {...props} onUnavailable={unavailable} />
            </PresentationBoundary>
        ) : <ClassicBoardPreview board={board} />}
    </div>;
}
