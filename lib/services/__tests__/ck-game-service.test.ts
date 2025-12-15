import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveBarbarianAttackAction } from '../ck-game-service';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';

vi.mock('@/lib/repositories/game-repository', () => ({
  getGameStateByRoomId: vi.fn(),
  updateGameState: vi.fn(),
}));

describe('ck-game-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recalculates VP after awarding Defender of Catan token', async () => {
    const player = createTestPlayer({
      id: 'p1',
      name: 'Player 1',
      settlementsRemaining: 4, // 1 settlement built
      citiesRemaining: 3, // 1 city built
      knights: [
        { id: 'k1', playerId: 'p1', vertexId: '0,0,0', level: 'basic', active: true },
      ],
    });

    const board = createTestBoard({
      vertices: [
        { id: '0,0,0', owner: 'p1', structure: 'city' },
      ],
    });

    const gameState = createTestGameState({
      id: 'game-1',
      roomId: 'room-1',
      players: [player, createTestPlayer({ id: 'p2', name: 'Player 2' })],
      board,
      phase: 'barbarian_attack',
      gameMode: 'cities_and_knights',
    });

    vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

    const result = await resolveBarbarianAttackAction('room-1');

    expect(updateGameState).toHaveBeenCalled();
    expect(result.players[0].defenderVPTokens).toBe(1);
    // 1 settlement (1) + 1 city (2) + defender token (1) = 4
    expect(result.players[0].victoryPoints).toBe(4);
  });
});
