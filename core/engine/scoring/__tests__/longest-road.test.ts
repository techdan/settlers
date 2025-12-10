import { beforeEach, describe, expect, it } from 'vitest';
import { updateLongestRoad } from '../longest-road';
import { createTestBoard, createTestEdge, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

const buildRoads = (owner: string, coords: Array<[number, number, number]>) =>
    coords.map(([q, r, d]) => createTestEdge({ q, r, d, owner, structure: 'road' }));

describe('Longest Road', () => {
    let gameState: GameState;

    beforeEach(() => {
        const players = [
            createTestPlayer({ id: 'p1', name: 'Player 1' }),
            createTestPlayer({ id: 'p2', name: 'Player 2', color: '#0000ff' }),
        ];

        gameState = createTestGameState({ players });
    });

    it('requires at least 5 roads to claim longest road', () => {
        const p1Edges = buildRoads('p1', [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3], // 4 connected roads
        ]);

        const board = createTestBoard({ edges: p1Edges });
        gameState.board = board;

        updateLongestRoad(gameState);

        expect(gameState.longestRoadOwner).toBeNull();
        expect(gameState.longestRoadLength).toBe(0);
    });

    it('awards longest road to player with 5 connected roads', () => {
        const p1Edges = buildRoads('p1', [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3],
            [0, 0, 4],
        ]);

        const board = createTestBoard({ edges: p1Edges });
        gameState.board = board;

        updateLongestRoad(gameState);

        expect(gameState.longestRoadOwner).toBe('p1');
        expect(gameState.longestRoadLength).toBe(5);
    });

    it('transfers ownership when another player builds a longer road', () => {
        const p1Edges = buildRoads('p1', [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3],
            [0, 0, 4],
        ]);
        const p2Edges = buildRoads('p2', [
            [2, 0, 0],
            [2, 0, 1],
            [2, 0, 2],
            [2, 0, 3],
            [2, 0, 4],
            [2, 0, 5],
        ]);

        const board = createTestBoard({ edges: [...p1Edges, ...p2Edges] });
        gameState.board = board;
        gameState.longestRoadOwner = 'p1';
        gameState.longestRoadLength = 5;

        updateLongestRoad(gameState);

        expect(gameState.longestRoadOwner).toBe('p2');
        expect(gameState.longestRoadLength).toBe(6);
    });

    it('keeps current owner on ties when they are part of the tie', () => {
        const p1Edges = buildRoads('p1', [
            [0, 0, 0],
            [0, 0, 1],
            [0, 0, 2],
            [0, 0, 3],
            [0, 0, 4],
        ]);
        const p2Edges = buildRoads('p2', [
            [2, 0, 0],
            [2, 0, 1],
            [2, 0, 2],
            [2, 0, 3],
            [2, 0, 4],
        ]);

        const board = createTestBoard({ edges: [...p1Edges, ...p2Edges] });
        gameState.board = board;
        gameState.longestRoadOwner = 'p1';
        gameState.longestRoadLength = 5;

        updateLongestRoad(gameState);

        expect(gameState.longestRoadOwner).toBe('p1');
        expect(gameState.longestRoadLength).toBe(5);
    });
});
