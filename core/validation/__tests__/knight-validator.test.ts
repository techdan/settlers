import { describe, expect, it } from 'vitest';
import { getEdgeEndpoints } from '@/lib/hex';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { isValidKnightPlacement } from '../knight-validator';

describe('isValidKnightPlacement', () => {
    it('accepts an empty endpoint connected to the player\'s perimeter road', () => {
        const player = createTestPlayer({ id: 'player-1' });
        const board = createTestBoard({
            edges: [{ q: 2, r: 0, d: 0, owner: player.id, structure: 'road' }],
        });
        const gameState = createTestGameState({
            gameMode: 'cities_and_knights',
            phase: 'main_phase',
            currentTurn: player.id,
            players: [player],
            board,
        });
        const [, emptyEndpoint] = getEdgeEndpoints(2, 0, 0);

        expect(isValidKnightPlacement(gameState, emptyEndpoint, player.id)).toBe(true);
    });
});
