import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { SaboteurCommand } from '../SaboteurCommand';

describe('SaboteurCommand', () => {
    it('starts discarding for every equal-or-higher-VP opponent when any has resources', () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'initiator',
                    name: 'Initiator',
                    victoryPoints: 3,
                    discardedThisTurn: true,
                }),
                createTestPlayer({
                    id: 'equal',
                    name: 'Equal',
                    victoryPoints: 3,
                    discardedThisTurn: true,
                    resources: {
                        wood: 2,
                        brick: 1,
                        sheep: 0,
                        wheat: 0,
                        ore: 0,
                    },
                }),
                createTestPlayer({
                    id: 'higher-empty',
                    name: 'Higher Empty',
                    victoryPoints: 5,
                    discardedThisTurn: true,
                }),
                createTestPlayer({
                    id: 'lower',
                    name: 'Lower',
                    victoryPoints: 2,
                    discardedThisTurn: true,
                    resources: {
                        wood: 5,
                        brick: 0,
                        sheep: 0,
                        wheat: 0,
                        ore: 0,
                    },
                }),
            ],
            discardContext: {
                type: 'robber',
            },
        });

        const result = new SaboteurCommand().execute(
            gameState,
            'initiator',
            { ignored: true },
        );

        expect(result).toBe(gameState);
        expect(result.phase).toBe('discarding');
        expect(result.discardContext).toEqual({
            type: 'sabotage',
            initiatorId: 'initiator',
            targetIds: ['equal', 'higher-empty'],
        });
        expect(result.players.every((player) => !player.discardedThisTurn)).toBe(
            true,
        );
        expect(result.logs.at(-1)?.message).toContain(
            'Equal, Higher Empty must discard half their resource cards',
        );
    });

    it('does not enter discarding when qualifying opponents have no resources', () => {
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
            discardContext: {
                type: 'robber',
            },
        });

        new SaboteurCommand().execute(gameState, 'initiator');

        expect(gameState.phase).toBe('main_phase');
        expect(gameState.discardContext).toBeUndefined();
        expect(gameState.logs.at(-1)?.message).toContain(
            'affected opponents have no resource cards to discard',
        );
    });

    it('does not enter discarding when no opponent has enough victory points', () => {
        const gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'initiator',
                    name: 'Initiator',
                    victoryPoints: 4,
                }),
                createTestPlayer({
                    id: 'lower',
                    name: 'Lower',
                    victoryPoints: 3,
                    resources: {
                        wood: 2,
                        brick: 0,
                        sheep: 0,
                        wheat: 0,
                        ore: 0,
                    },
                }),
            ],
        });

        new SaboteurCommand().execute(gameState, 'initiator');

        expect(gameState.phase).toBe('main_phase');
        expect(gameState.discardContext).toBeUndefined();
        expect(gameState.logs.at(-1)?.message).toContain(
            'no opponents have equal or more victory points',
        );
    });
});
