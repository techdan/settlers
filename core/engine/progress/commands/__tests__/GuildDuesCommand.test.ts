import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { GuildDuesCommand } from '../GuildDuesCommand';

describe('GuildDuesCommand theft notifications', () => {
  it('records both selected cards for the thief and robbed player', () => {
    const thief = createTestPlayer({
      id: 'thief',
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
      commodities: { paper: 0, cloth: 0, coin: 0 },
    });
    const victim = createTestPlayer({
      id: 'victim',
      resources: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
      commodities: { paper: 0, cloth: 1, coin: 0 },
    });
    const state = createTestGameState({ players: [thief, victim] });

    new GuildDuesCommand().execute(state, thief.id, {
      opponentId: victim.id,
      card1Type: 'resource',
      card1Value: 'wood',
      card2Type: 'commodity',
      card2Value: 'cloth',
    });

    expect(state.lastTheft).toMatchObject({
      source: 'guild_dues',
      victimId: victim.id,
      thiefId: thief.id,
      items: [
        { type: 'resource', value: 'wood', count: 1 },
        { type: 'commodity', value: 'cloth', count: 1 },
      ],
    });
    expect(state.theftEvents).toEqual([state.lastTheft]);
    expect(thief.resources.wood).toBe(1);
    expect(thief.commodities?.cloth).toBe(1);
    expect(victim.resources.wood).toBe(0);
    expect(victim.commodities?.cloth).toBe(0);
  });
});
