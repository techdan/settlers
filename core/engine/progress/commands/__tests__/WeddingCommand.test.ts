import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { WeddingCommand } from '../WeddingCommand';

describe('WeddingCommand', () => {
    it('creates requests for higher-VP opponents based on their available cards', () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'initiator',
                    name: 'Initiator',
                    victoryPoints: 3,
                }),
                createTestPlayer({
                    id: 'two-cards',
                    name: 'Two Cards',
                    victoryPoints: 5,
                    resources: {
                        wood: 1,
                        brick: 0,
                        sheep: 0,
                        wheat: 0,
                        ore: 0,
                    },
                    commodities: { paper: 1, cloth: 0, coin: 0 },
                }),
                createTestPlayer({
                    id: 'one-card',
                    name: 'One Card',
                    victoryPoints: 4,
                    resources: {
                        wood: 0,
                        brick: 0,
                        sheep: 0,
                        wheat: 0,
                        ore: 1,
                    },
                }),
                createTestPlayer({
                    id: 'empty',
                    name: 'Empty',
                    victoryPoints: 6,
                }),
                createTestPlayer({
                    id: 'equal-vp',
                    name: 'Equal VP',
                    victoryPoints: 3,
                    resources: {
                        wood: 3,
                        brick: 0,
                        sheep: 0,
                        wheat: 0,
                        ore: 0,
                    },
                }),
            ],
        });

        const result = new WeddingCommand().execute(
            gameState,
            'initiator',
            { ignored: true },
        );

        expect(result).toBe(gameState);
        expect(result.pendingWedding).toEqual({
            initiatorId: 'initiator',
            requests: [
                {
                    playerId: 'two-cards',
                    requiredCards: 2,
                    status: 'pending',
                },
                {
                    playerId: 'one-card',
                    requiredCards: 1,
                    status: 'pending',
                },
                {
                    playerId: 'empty',
                    requiredCards: 0,
                    status: 'skipped',
                },
            ],
        });
        expect(result.logs.at(-1)?.message).toContain(
            'Waiting for 2 opponents',
        );
    });

    it('does not create pending state when qualifying opponents have no cards', () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'initiator',
                    name: 'Initiator',
                    victoryPoints: 2,
                }),
                createTestPlayer({
                    id: 'empty',
                    name: 'Empty',
                    victoryPoints: 3,
                }),
            ],
            pendingWedding: {
                initiatorId: 'stale',
                requests: [],
            },
        });

        new WeddingCommand().execute(gameState, 'initiator');

        expect(gameState.pendingWedding).toBeUndefined();
        expect(gameState.logs.at(-1)?.message).toContain(
            'eligible opponents have no cards to give',
        );
    });

    it('does not create pending state when no opponent has more victory points', () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'initiator',
                    name: 'Initiator',
                    victoryPoints: 4,
                }),
                createTestPlayer({
                    id: 'equal',
                    name: 'Equal',
                    victoryPoints: 4,
                }),
                createTestPlayer({
                    id: 'lower',
                    name: 'Lower',
                    victoryPoints: 3,
                }),
            ],
        });

        new WeddingCommand().execute(gameState, 'initiator');

        expect(gameState.pendingWedding).toBeUndefined();
        expect(gameState.logs.at(-1)?.message).toContain(
            'no opponents have more victory points',
        );
    });
});
