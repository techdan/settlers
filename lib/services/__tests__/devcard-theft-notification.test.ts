import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { playDevCard } from '../devcard-service';

vi.mock('@/lib/repositories/game-repository', () => ({
  getGameStateByRoomId: vi.fn(),
  updateGameState: vi.fn(),
}));

describe('development card theft notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records each victim affected by Monopoly', async () => {
    const thief = createTestPlayer({
      id: 'thief',
      devCards: {
        knight: 0,
        victory_point: 0,
        road_building: 0,
        year_of_plenty: 0,
        monopoly: 1,
      },
    });
    const firstVictim = createTestPlayer({
      id: 'victim-1',
      resources: { wood: 0, brick: 2, sheep: 0, wheat: 0, ore: 0 },
    });
    const secondVictim = createTestPlayer({
      id: 'victim-2',
      resources: { wood: 0, brick: 1, sheep: 0, wheat: 0, ore: 0 },
    });
    const state = createTestGameState({
      players: [thief, firstVictim, secondVictim],
      currentTurn: thief.id,
      phase: 'main_phase',
    });
    vi.mocked(getGameStateByRoomId).mockResolvedValue(state);

    const result = await playDevCard(state.roomId, thief.id, 'monopoly', {
      monopolyResource: 'brick',
    });

    expect(result.lastTheft).toMatchObject({
      source: 'monopoly',
      thiefId: thief.id,
      items: [{ type: 'resource', value: 'brick', count: 3 }],
      victims: [
        {
          victimId: firstVictim.id,
          items: [{ type: 'resource', value: 'brick', count: 2 }],
        },
        {
          victimId: secondVictim.id,
          items: [{ type: 'resource', value: 'brick', count: 1 }],
        },
      ],
    });
    expect(updateGameState).toHaveBeenCalledWith(result);
  });
});
