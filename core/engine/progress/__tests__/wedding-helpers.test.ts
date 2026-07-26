import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { respondToWedding } from '../utilities/WeddingHelpers';

describe('respondToWedding', () => {
    it('labels the resulting transfer as a Wedding event', () => {
        const initiator = createTestPlayer({ id: 'initiator', name: 'Initiator' });
        const giver = createTestPlayer({
            id: 'giver',
            name: 'Giver',
            resources: { wood: 0, brick: 0, sheep: 2, wheat: 0, ore: 0 },
        });
        const gameState = createTestGameState({
            players: [initiator, giver],
            pendingWedding: {
                initiatorId: initiator.id,
                requests: [{ playerId: giver.id, requiredCards: 2, status: 'pending' }],
            },
        });

        respondToWedding(gameState, giver.id, [
            { type: 'resource', value: 'sheep' },
            { type: 'resource', value: 'sheep' },
        ]);

        expect(gameState.lastTheft).toMatchObject({
            source: 'wedding',
            victimId: giver.id,
            thiefId: initiator.id,
            items: [{ type: 'resource', value: 'sheep', count: 2 }],
        });
    });
});
