import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStandardBoard } from '@/core/engine/board/board-generator';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import type { BoardSelectionState } from '@/lib/types/board-selection-state';

const transformWrapperProps = vi.hoisted(() => ({
    current: null as Record<string, unknown> | null,
}));

vi.mock('react-zoom-pan-pinch', () => ({
    TransformWrapper: ({
        children,
        ...props
    }: {
        children: ReactNode | ((controls: Record<string, ReturnType<typeof vi.fn>>) => ReactNode);
        [key: string]: unknown;
    }) => {
        transformWrapperProps.current = props;

        return typeof children === 'function'
            ? children({
                zoomIn: vi.fn(),
                zoomOut: vi.fn(),
                resetTransform: vi.fn(),
                setTransform: vi.fn(),
            })
            : children;
    },
    TransformComponent: ({ children }: { children: ReactNode }) => children,
}));

import { BoardCanvas } from '@/components/board/BoardCanvas';

describe('BoardCanvas pan bounds', () => {
    beforeEach(() => {
        transformWrapperProps.current = null;
    });

    it('allows a bounded pan margin without inertial movement or snap-back', () => {
        const player = createTestPlayer({ id: 'player-1' });
        const gameState = createTestGameState({
            players: [player],
            currentTurn: player.id,
            board: {
                hexes: generateStandardBoard(),
                vertices: {},
                edges: {},
            },
        });
        const selectionState: BoardSelectionState = { buildMode: null };

        render(
            <BoardCanvas
                gameState={gameState}
                playerId={player.id}
                hexSize={90}
                selectionState={selectionState}
                validation={{
                    validVertices: new Set(),
                    validEdges: new Set(),
                    validHexes: new Set(),
                }}
                vertices={[]}
                renderEdges={[]}
                knightsMap={new Map()}
                pendingPlacement={null}
                displayedRobberHexId={gameState.robberHexId}
                onVertexClick={vi.fn()}
                onEdgeClick={vi.fn()}
                onHexClick={vi.fn()}
                onConfirmPlacement={vi.fn()}
                onCancelPlacement={vi.fn()}
                onCancelBuild={vi.fn()}
            />
        );

        expect(transformWrapperProps.current).toMatchObject({
            limitToBounds: true,
            panning: {
                velocityDisabled: true,
            },
            alignmentAnimation: {
                disabled: true,
                sizeX: 100,
                sizeY: 100,
            },
        });
        expect(transformWrapperProps.current).not.toHaveProperty('disablePadding');
    });
});
