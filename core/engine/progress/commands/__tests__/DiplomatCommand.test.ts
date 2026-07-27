import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidMainPhaseRoad } from '@/core/validation/building-validator';
import { isOpenRoad } from '@/core/validation/diplomat-validator';
import {
    createTestBoard,
    createTestEdge,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils';
import { DiplomatCommand } from '../DiplomatCommand';

vi.mock('@/core/validation/building-validator', () => ({
    isValidMainPhaseRoad: vi.fn(),
}));

vi.mock('@/core/validation/diplomat-validator', () => ({
    isOpenRoad: vi.fn(),
}));

const isValidMainPhaseRoadMock = vi.mocked(isValidMainPhaseRoad);
const isOpenRoadMock = vi.mocked(isOpenRoad);

describe('DiplomatCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isOpenRoadMock.mockReturnValue(true);
        isValidMainPhaseRoadMock.mockReturnValue(true);
    });

    it('removes an open road without rebuilding it', () => {
        const road = createTestEdge({
            id: '0,0,0',
            owner: 'p2',
            structure: 'road',
        });
        const gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Diplomat' }),
                createTestPlayer({ id: 'p2', name: 'Opponent' }),
            ],
            board: createTestBoard({ edges: [road] }),
        });

        const result = new DiplomatCommand().execute(gameState, 'p1', {
            edgeId: road.id,
        });

        expect(result).toBe(gameState);
        expect(isOpenRoadMock).toHaveBeenCalledWith(gameState, road.id);
        expect(isValidMainPhaseRoadMock).not.toHaveBeenCalled();
        expect(gameState.board.edges[road.id]).toMatchObject({
            owner: null,
            structure: null,
        });
        expect(gameState.logs.at(-1)?.message).toContain(
            'removed a road (did not replace)',
        );
    });

    it('rebuilds an owned open road at the validated target edge', () => {
        const sourceRoad = createTestEdge({
            id: '0,0,0',
            owner: 'p1',
            structure: 'road',
        });
        const targetEdge = createTestEdge({
            id: '1,0,0',
            owner: null,
            structure: null,
        });
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', name: 'Diplomat' })],
            board: createTestBoard({ edges: [sourceRoad, targetEdge] }),
        });

        new DiplomatCommand().execute(gameState, 'p1', {
            edgeId: sourceRoad.id,
            newEdgeId: targetEdge.id,
        });

        expect(isValidMainPhaseRoadMock).toHaveBeenCalledOnce();
        const [simulatedState, validatedEdgeId, validatedPlayerId] =
            isValidMainPhaseRoadMock.mock.calls[0];
        expect(simulatedState.board.edges[sourceRoad.id]).toMatchObject({
            owner: null,
            structure: null,
        });
        expect(validatedEdgeId).toBe(targetEdge.id);
        expect(validatedPlayerId).toBe('p1');
        expect(gameState.board.edges[sourceRoad.id]).toMatchObject({
            owner: null,
            structure: null,
        });
        expect(gameState.board.edges[targetEdge.id]).toMatchObject({
            owner: 'p1',
            structure: 'road',
        });
        expect(gameState.logs.at(-1)?.message).toContain(
            'moved their road to a new location with Diplomat',
        );
    });
});
