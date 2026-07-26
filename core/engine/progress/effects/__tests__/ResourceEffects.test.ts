import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { executeStealFromOpponents } from '../ResourceEffects';

describe('executeStealFromOpponents theft notifications', () => {
  it('records the exact Resource Monopoly loss for every affected player', () => {
    const thief = createTestPlayer({ id: 'thief' });
    const firstVictim = createTestPlayer({
      id: 'victim-1',
      resources: { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    });
    const secondVictim = createTestPlayer({
      id: 'victim-2',
      resources: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    });
    const state = createTestGameState({
      players: [thief, firstVictim, secondVictim],
    });

    executeStealFromOpponents(
      state,
      thief.id,
      {
        type: 'steal_from_opponents',
        cardType: 'resource',
        maxPerOpponent: 2,
        requiresSelection: true,
      },
      { resource: 'wood' }
    );

    expect(state.lastTheft).toMatchObject({
      source: 'resource_monopoly',
      thiefId: thief.id,
      items: [{ type: 'resource', value: 'wood', count: 3 }],
      victims: [
        {
          victimId: firstVictim.id,
          items: [{ type: 'resource', value: 'wood', count: 2 }],
        },
        {
          victimId: secondVictim.id,
          items: [{ type: 'resource', value: 'wood', count: 1 }],
        },
      ],
    });
  });
});
