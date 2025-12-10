import { describe, expect, it } from 'vitest';
import { isValidMetropolisPlacement } from '../metropolis-validator';
import { createTestBoard, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

const METROPOLIS_REQUIRED = CK_CONSTANTS.METROPOLIS_REQUIREMENT;

describe('Metropolis Validator', () => {
    it('allows placement on own city with sufficient improvements when unclaimed', () => {
        const vertex = createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' });
        const player = createTestPlayer({
            id: 'p1',
            improvements: { science: METROPOLIS_REQUIRED, trade: 0, politics: 0 },
        });

        const gameState = createTestGameState({
            players: [player],
            board: createTestBoard({ vertices: [vertex] }),
        });

        expect(isValidMetropolisPlacement(gameState, vertex.id, 'p1', 'science')).toBe(true);
    });

    it('rejects placement when improvement level is too low', () => {
        const vertex = createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' });
        const player = createTestPlayer({
            id: 'p1',
            improvements: { science: METROPOLIS_REQUIRED - 1, trade: 0, politics: 0 },
        });

        const gameState = createTestGameState({
            players: [player],
            board: createTestBoard({ vertices: [vertex] }),
        });

        expect(isValidMetropolisPlacement(gameState, vertex.id, 'p1', 'science')).toBe(false);
    });

    it('allows stealing metropolis with higher improvement level', () => {
        const vertex = createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' });
        const player = createTestPlayer({
            id: 'p1',
            improvements: { science: METROPOLIS_REQUIRED + 1, trade: 0, politics: 0 },
        });
        const opponent = createTestPlayer({
            id: 'p2',
            improvements: { science: METROPOLIS_REQUIRED, trade: 0, politics: 0 },
        });

        const gameState = createTestGameState({
            players: [player, opponent],
            board: createTestBoard({ vertices: [vertex] }),
            metropolises: {
                science: { type: 'science', owner: 'p2', vertexId: '1,0,0' },
                trade: { type: 'trade', owner: null, vertexId: null },
                politics: { type: 'politics', owner: null, vertexId: null },
            },
        });

        expect(isValidMetropolisPlacement(gameState, vertex.id, 'p1', 'science')).toBe(true);
    });
});
