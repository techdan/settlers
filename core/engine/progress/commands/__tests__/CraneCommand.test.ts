import { describe, expect, it } from 'vitest';
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
    createTestVertex,
} from '@/lib/test-utils';
import { CraneCommand } from '../CraneCommand';

describe('CraneCommand', () => {
    it('upgrades the selected improvement with a one-commodity discount', () => {
        const player = createTestPlayer({
            id: 'p1',
            name: 'Builder',
            improvements: { science: 1, trade: 0, politics: 0 },
            commodities: { paper: 1, cloth: 0, coin: 0 },
        });
        const gameState = createTestGameState({ players: [player] });

        const result = new CraneCommand().execute(gameState, 'p1', {
            improvement: 'science',
        });

        expect(result).toBe(gameState);
        expect(player.improvements?.science).toBe(2);
        expect(player.commodities?.paper).toBe(0);
        expect(result.logs.at(-1)?.message).toContain(
            'upgrade science to level 2 (cost reduced by 1 commodity)',
        );
    });

    it('leaves metropolis placement pending when the discounted upgrade reaches level four', () => {
        const player = createTestPlayer({
            id: 'p1',
            name: 'Builder',
            improvements: { science: 3, trade: 0, politics: 0 },
            commodities: { paper: 3, cloth: 0, coin: 0 },
        });
        const gameState = createTestGameState({
            players: [player],
            board: createTestBoard({
                vertices: [
                    createTestVertex({
                        id: 'city-1',
                        owner: 'p1',
                        structure: 'city',
                    }),
                ],
            }),
        });

        new CraneCommand().execute(gameState, 'p1', {
            improvement: 'science',
        });

        expect(player.improvements?.science).toBe(4);
        expect(player.commodities?.paper).toBe(0);
        expect(player.metropolisOwned).not.toContain('science');
        expect(gameState.board.vertices['city-1'].structure).toBe('city');
        expect(gameState.metropolises?.science).toMatchObject({
            owner: null,
            vertexId: null,
        });
    });

    it('rejects an option that is not a canonical improvement type', () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', name: 'Builder' })],
        });

        expect(() =>
            new CraneCommand().execute(gameState, 'p1', {
                improvement: 'invalid',
            })
        ).toThrow('Crane requires selecting an improvement to upgrade');
    });
});
