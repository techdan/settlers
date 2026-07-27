import { describe, expect, it } from 'vitest';
import { relocateKnight } from '@/core/engine/knights/knight-manager';
import { getAdjacentEdgesForVertex } from '@/lib/hex';
import {
    createTestBoard,
    createTestEdge,
    createTestGameState,
    createTestPlayer,
} from '@/lib/test-utils';
import { IntrigueCommand } from '../IntrigueCommand';

const KNIGHT_VERTEX_ID = '0,0,0';
const KNIGHT_ID = 'opponent-knight';

function createIntrigueState() {
    const adjacentRouteId = getAdjacentEdgesForVertex(0, 0, 0)[0];
    const opponent = createTestPlayer({
        id: 'p2',
        name: 'Opponent',
        knights: [
            {
                id: KNIGHT_ID,
                playerId: 'p2',
                vertexId: KNIGHT_VERTEX_ID,
                level: 'mighty',
                active: true,
            },
        ],
    });
    const gameState = createTestGameState({
        players: [
            createTestPlayer({ id: 'p1', name: 'Intriguer' }),
            opponent,
        ],
        gameMode: 'cities_and_knights',
        hasBarbariansAttacked: true,
        board: createTestBoard({
            edges: [
                createTestEdge({
                    id: adjacentRouteId,
                    owner: 'p1',
                    structure: 'road',
                }),
            ],
        }),
    });

    return { gameState, opponent };
}

describe('IntrigueCommand', () => {
    it('displaces an adjacent opponent mighty knight regardless of strength', () => {
        const { gameState, opponent } = createIntrigueState();

        const result = new IntrigueCommand().execute(gameState, 'p1', {
            opponentId: 'p2',
            knightId: KNIGHT_ID,
        });

        expect(result).toBe(gameState);
        expect(opponent.knights?.[0].vertexId).toBe('displaced');
        expect(gameState.phase).toBe('knight_displacement');
        expect(gameState.pendingDisplacement).toEqual({
            knightId: KNIGHT_ID,
            playerId: 'p2',
            originVertexId: KNIGHT_VERTEX_ID,
            previousPhase: 'main_phase',
        });
        expect(gameState.logs.at(-1)?.message).toContain(
            "displaced Opponent's mighty knight with Intrigue",
        );
    });

    it('supports removing the knight after Intrigue creates displacement state', () => {
        const { gameState, opponent } = createIntrigueState();
        new IntrigueCommand().execute(gameState, 'p1', {
            opponentId: 'p2',
            knightId: KNIGHT_ID,
        });

        relocateKnight(gameState, 'p2', KNIGHT_ID, null);

        expect(opponent.knights).toEqual([]);
        expect(gameState.pendingDisplacement).toBeUndefined();
        expect(gameState.phase).toBe('main_phase');
        expect(gameState.logs.at(-1)?.message).toContain(
            'removed their displaced knight',
        );
    });
});
