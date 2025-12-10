import { describe, expect, it } from 'vitest';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import {
    createTestBoard,
    createTestEdge,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils';

describe('Test Setup', () => {
    it('creates a valid test player with defaults', () => {
        const player = createTestPlayer();

        expect(player.id).toBe('player-1');
        expect(player.resources.wood).toBe(0);
        expect(player.settlementsRemaining).toBe(GAME_CONSTANTS.STARTING_PIECES.settlements);
        expect(player.citiesRemaining).toBe(GAME_CONSTANTS.STARTING_PIECES.cities);
    });

    it('creates a valid game state with override support', () => {
        const player = createTestPlayer({ id: 'custom-player', name: 'Custom' });
        const gameState = createTestGameState({ players: [player], currentTurn: 'custom-player' });

        expect(gameState.roomId).toBe('room-1');
        expect(gameState.players).toHaveLength(1);
        expect(gameState.players[0].name).toBe('Custom');
        expect(gameState.currentTurn).toBe('custom-player');
    });

    it('creates missing vertices for edges on test board', () => {
        const edge = createTestEdge({ q: 0, r: 0, d: 0, owner: 'player-1', structure: 'road' });
        const board = createTestBoard({ edges: [edge] });

        expect(board.edges[edge.id]).toBeDefined();
        const [v1, v2] = Object.keys(board.vertices);
        expect(board.vertices[v1]).toBeDefined();
        expect(board.vertices[v2]).toBeDefined();
    });
});
