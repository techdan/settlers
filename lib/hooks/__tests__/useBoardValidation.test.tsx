import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HexTileData } from '@/core/engine/board/board-generator';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';
import {
    isValidMainPhaseCity,
    isValidMainPhaseRoad,
} from '@/core/validation/building-validator';
import { getOpenRoadIds } from '@/core/validation/diplomat-validator';
import { canMoveKnightToVertex } from '@/core/validation/knight-validator';
import { getCanonicalVertexId } from '@/lib/hex';
import { useBoardValidation } from '@/lib/hooks/useBoardValidation';
import {
    createTestBoard,
    createTestEdge,
    createTestGameState,
    createTestPlayer,
    createTestVertex,
} from '@/lib/test-utils/test-helpers';
import type {
    BoardSelectionState,
    PendingBoardPlacement,
} from '@/lib/types/board-selection-state';
import type { GameState } from '@/lib/types/game';

vi.mock('@/core/validation/setup-validator', () => ({
    isValidSetupSettlement: vi.fn(() => false),
    isValidSetupRoad: vi.fn(() => false),
}));

vi.mock('@/core/validation/building-validator', () => ({
    isValidMainPhaseRoad: vi.fn(() => false),
    isValidMainPhaseSettlement: vi.fn(() => false),
    isValidMainPhaseCity: vi.fn(() => false),
}));

vi.mock('@/core/validation/knight-validator', () => ({
    isValidKnightPlacement: vi.fn(() => false),
    canMoveKnightToVertex: vi.fn(() => false),
}));

vi.mock('@/core/validation/city-wall-validator', () => ({
    canBuildCityWall: vi.fn(() => false),
}));

vi.mock('@/core/engine/knights/knight-manager', () => ({
    getValidRelocationTargets: vi.fn(() => []),
}));

vi.mock('@/core/validation/diplomat-validator', () => ({
    getOpenRoadIds: vi.fn(() => []),
}));

const players = [
    createTestPlayer({ id: 'p1', name: 'Pa' }),
    createTestPlayer({ id: 'p2', name: 'Pb' }),
];

function renderValidation({
    gameState,
    selectionState = { buildMode: null },
    pendingPlacement = null,
}: {
    gameState: GameState;
    selectionState?: BoardSelectionState;
    pendingPlacement?: PendingBoardPlacement | null;
}) {
    const vertices = Object.values(gameState.board.vertices);
    const edges = Object.values(gameState.board.edges);
    const tiles = gameState.board.hexes;

    return renderHook(() =>
        useBoardValidation(
            gameState,
            'p1',
            selectionState,
            vertices,
            edges,
            tiles,
            pendingPlacement
        )
    );
}

describe('useBoardValidation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('routes main-phase city highlighting through the city validator', () => {
        const vertices = [
            createTestVertex({ id: 'city-target' }),
            createTestVertex({ id: 'blocked-target', d: 1 }),
        ];
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            phase: 'main_phase',
            board: createTestBoard({ vertices }),
        });
        vi.mocked(isValidMainPhaseCity).mockImplementation(
            (_state, vertexId) => vertexId === 'city-target'
        );

        const { result } = renderValidation({
            gameState,
            selectionState: { buildMode: 'city' },
        });

        expect([...result.current.validVertices]).toEqual(['city-target']);
        expect(isValidMainPhaseCity).toHaveBeenCalledTimes(2);
        expect(result.current.validEdges.size).toBe(0);
        expect(result.current.validHexes.size).toBe(0);
    });

    it('allows the displaced player to relocate even when it is another player’s turn', () => {
        const gameState = createTestGameState({
            players,
            currentTurn: 'p2',
            phase: 'knight_displacement',
            pendingDisplacement: {
                knightId: 'knight-1',
                playerId: 'p1',
                originVertexId: 'origin',
                previousPhase: 'main_phase',
            },
        });
        vi.mocked(getValidRelocationTargets).mockReturnValue(['target-a', 'target-b']);

        const { result } = renderValidation({ gameState });

        expect([...result.current.validVertices]).toEqual(['target-a', 'target-b']);
        expect(getValidRelocationTargets).toHaveBeenCalledWith(
            gameState,
            'p1',
            'origin'
        );
    });

    it('routes knight movement highlighting through the movement validator', () => {
        const movingKnight = {
            id: 'knight-1',
            playerId: 'p1',
            vertexId: 'origin',
            level: 'basic' as const,
            active: true,
        };
        const vertices = [
            createTestVertex({ id: 'target-a' }),
            createTestVertex({ id: 'target-b', d: 1 }),
        ];
        const gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Pa', knights: [movingKnight] }),
                players[1],
            ],
            currentTurn: 'p1',
            phase: 'main_phase',
            board: createTestBoard({ vertices }),
        });
        vi.mocked(canMoveKnightToVertex).mockImplementation(
            (_state, _knight, vertexId) => vertexId === 'target-b'
        );

        const { result } = renderValidation({
            gameState,
            selectionState: {
                buildMode: null,
                movingKnightId: movingKnight.id,
            },
        });

        expect([...result.current.validVertices]).toEqual(['target-b']);
        expect(canMoveKnightToVertex).toHaveBeenCalledTimes(2);
    });

    it('suppresses every highlight while a placement is awaiting confirmation', () => {
        const vertex = createTestVertex({ id: 'city-target' });
        const edge = createTestEdge({ id: 'road-target' });
        const hexes: HexTileData[] = [
            { id: '0,0', hex: { q: 0, r: 0, s: 0 }, terrain: 'forest', numberToken: 5 },
            { id: '1,0', hex: { q: 1, r: 0, s: -1 }, terrain: 'field', numberToken: 9 },
        ];
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            phase: 'robber_placement',
            robberHexId: '0,0',
            board: createTestBoard({ vertices: [vertex], edges: [edge], hexes }),
        });
        vi.mocked(isValidMainPhaseCity).mockReturnValue(true);
        vi.mocked(isValidMainPhaseRoad).mockReturnValue(true);

        const { result } = renderValidation({
            gameState,
            selectionState: { buildMode: 'city' },
            pendingPlacement: {
                type: 'settlement',
                id: vertex.id,
                phase: 'main',
            },
        });

        expect(result.current.validVertices.size).toBe(0);
        expect(result.current.validEdges.size).toBe(0);
        expect(result.current.validHexes.size).toBe(0);
        expect(isValidMainPhaseCity).not.toHaveBeenCalled();
        expect(isValidMainPhaseRoad).not.toHaveBeenCalled();
    });

    it('validates Diplomat rebuild locations against a derived state without mutating the game', () => {
        const removedRoad = createTestEdge({
            id: 'removed-road',
            owner: 'p1',
            structure: 'road',
        });
        const candidateRoad = createTestEdge({ id: 'candidate-road', d: 1 });
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            board: createTestBoard({ edges: [removedRoad, candidateRoad] }),
        });
        vi.mocked(isValidMainPhaseRoad).mockImplementation(
            (state, edgeId) =>
                edgeId === candidateRoad.id &&
                state.board.edges[removedRoad.id].owner === null &&
                state.board.edges[removedRoad.id].structure === null
        );

        const { result } = renderValidation({
            gameState,
            selectionState: {
                buildMode: null,
                edgeCardSelection: {
                    type: 'diplomat',
                    stage: 'rebuild',
                    removedEdgeId: removedRoad.id,
                },
            },
        });

        expect([...result.current.validEdges]).toEqual([candidateRoad.id]);
        expect(result.current.diplomatPlacementState).not.toBe(gameState);
        expect(
            result.current.diplomatPlacementState?.board.edges[removedRoad.id]
        ).toMatchObject({ owner: null, structure: null });
        expect(gameState.board.edges[removedRoad.id]).toMatchObject({
            owner: 'p1',
            structure: 'road',
        });
        expect(getOpenRoadIds).not.toHaveBeenCalled();
    });

    it('highlights every robber destination except the occupied hex', () => {
        const hexes: HexTileData[] = [
            { id: '0,0', hex: { q: 0, r: 0, s: 0 }, terrain: 'desert', numberToken: null },
            { id: '1,0', hex: { q: 1, r: 0, s: -1 }, terrain: 'forest', numberToken: 5 },
            { id: '0,1', hex: { q: 0, r: 1, s: -1 }, terrain: 'field', numberToken: 9 },
        ];
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            phase: 'robber_placement',
            robberHexId: '0,0',
            board: createTestBoard({ hexes }),
        });

        const { result } = renderValidation({ gameState });

        expect([...result.current.validHexes]).toEqual(['1,0', '0,1']);
    });

    it('highlights Merchant targets adjacent to the player’s building', () => {
        const adjacentVertex = createTestVertex({
            id: getCanonicalVertexId(0, 0, 0),
            owner: 'p1',
            structure: 'settlement',
        });
        const hexes: HexTileData[] = [
            { id: '0,0', hex: { q: 0, r: 0, s: 0 }, terrain: 'forest', numberToken: 5 },
            { id: '2,0', hex: { q: 2, r: 0, s: -2 }, terrain: 'field', numberToken: 9 },
        ];
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            board: createTestBoard({ vertices: [adjacentVertex], hexes }),
        });

        const { result } = renderValidation({
            gameState,
            selectionState: {
                buildMode: null,
                hexCardSelection: { type: 'merchant' },
            },
        });

        expect([...result.current.validHexes]).toEqual(['0,0']);
    });

    it('filters Inventor targets by terrain and restricted number tokens', () => {
        const hexes: HexTileData[] = [
            { id: 'valid', hex: { q: 0, r: 0, s: 0 }, terrain: 'forest', numberToken: 5 },
            { id: 'red-number', hex: { q: 1, r: 0, s: -1 }, terrain: 'field', numberToken: 6 },
            { id: 'edge-number', hex: { q: 0, r: 1, s: -1 }, terrain: 'hill', numberToken: 12 },
            { id: 'desert', hex: { q: -1, r: 0, s: 1 }, terrain: 'desert', numberToken: null },
        ];
        const gameState = createTestGameState({
            players,
            currentTurn: 'p1',
            board: createTestBoard({ hexes }),
        });

        const { result } = renderValidation({
            gameState,
            selectionState: {
                buildMode: null,
                hexCardSelection: { type: 'inventor' },
            },
        });

        expect([...result.current.validHexes]).toEqual(['valid']);
    });
});
