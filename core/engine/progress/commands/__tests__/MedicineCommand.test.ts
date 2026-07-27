import { describe, expect, it } from 'vitest';
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
    createTestVertex,
} from '@/lib/test-utils';
import { MedicineCommand } from '../MedicineCommand';

const SETTLEMENT_ID = '0,0,0';

function createMedicineState(defenderVPTokens = 0) {
    const player = createTestPlayer({
        id: 'p1',
        name: 'Doctor',
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 1, ore: 2 },
        settlementsRemaining: 4,
        citiesRemaining: 4,
        defenderVPTokens,
    });
    const gameState = createTestGameState({
        players: [player],
        gameMode: 'cities_and_knights',
        board: createTestBoard({
            vertices: [
                createTestVertex({
                    id: SETTLEMENT_ID,
                    owner: 'p1',
                    structure: 'settlement',
                }),
            ],
        }),
    });

    return { gameState, player };
}

describe('MedicineCommand', () => {
    it('pays the shared Medicine cost and upgrades the settlement to a city', () => {
        const { gameState, player } = createMedicineState();

        const result = new MedicineCommand().execute(gameState, 'p1', {
            vertexId: SETTLEMENT_ID,
        });

        expect(result).toBe(gameState);
        expect(player.resources).toMatchObject({ ore: 0, wheat: 0 });
        expect(player.citiesRemaining).toBe(3);
        expect(player.settlementsRemaining).toBe(5);
        expect(gameState.board.vertices[SETTLEMENT_ID].structure).toBe('city');
        expect(player.victoryPoints).toBe(2);
        expect(gameState.winner).toBeNull();
        expect(gameState.phase).toBe('main_phase');
        expect(gameState.logs.at(-1)?.message).toContain(
            'upgraded a settlement to a city with Medicine',
        );
    });

    it('sets the winner and game-over phase when the city reaches the victory threshold', () => {
        const { gameState, player } = createMedicineState(11);

        new MedicineCommand().execute(gameState, 'p1', {
            vertexId: SETTLEMENT_ID,
        });

        expect(player.victoryPoints).toBe(13);
        expect(gameState.winner).toBe('p1');
        expect(gameState.phase).toBe('game_over');
        expect(gameState.logs.at(-1)?.message).toContain(
            'Doctor wins with 13 victory points',
        );
    });

    it('rejects a non-string settlement selection', () => {
        const { gameState } = createMedicineState();

        expect(() =>
            new MedicineCommand().execute(gameState, 'p1', {
                vertexId: 42,
            })
        ).toThrow('Medicine requires selecting one of your settlements');
    });
});
