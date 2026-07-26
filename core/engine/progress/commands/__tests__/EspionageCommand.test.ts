import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { EspionageCommand } from '../EspionageCommand';

describe('EspionageCommand theft notifications', () => {
  it('records the stolen progress card for both players', () => {
    const thief = createTestPlayer({ id: 'thief', progressCards: [] });
    const victim = createTestPlayer({ id: 'victim', progressCards: ['smith'] });
    const state = createTestGameState({ players: [thief, victim] });

    new EspionageCommand().execute(state, thief.id, {
      opponentId: victim.id,
      stolenCard: 'smith',
    });

    expect(state.lastTheft).toMatchObject({
      source: 'espionage',
      victimId: victim.id,
      thiefId: thief.id,
      items: [{ type: 'progress_card', value: 'smith', count: 1 }],
    });
    expect(thief.progressCards).toEqual(['smith']);
    expect(victim.progressCards).toEqual([]);
  });
});
