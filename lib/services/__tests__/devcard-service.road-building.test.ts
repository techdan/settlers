import { beforeEach, describe, expect, it, vi } from 'vitest';
import { placeBonusRoad } from '@/lib/services/devcard-service';
import { getGameStateByRoomId } from '@/lib/repositories/game-repository';
import { persistGameState } from '@/lib/services/game-persistence-service';
import { isValidMainPhaseRoad } from '@/core/validation/building-validator';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';

vi.mock('@/lib/repositories/game-repository', () => ({
  getGameStateByRoomId: vi.fn(),
}));

vi.mock('@/lib/services/game-persistence-service', () => ({
  persistGameState: vi.fn(),
}));

vi.mock('@/core/validation/building-validator', () => ({
  isValidMainPhaseRoad: vi.fn(),
}));

vi.mock('@/core/engine/scoring/longest-road', () => ({
  updateLongestRoadIncremental: vi.fn(),
}));

vi.mock('@/core/rules/victory-conditions', () => ({
  updateAllVictoryPoints: vi.fn(),
}));

vi.mock('@/lib/services/game-service', () => ({
  checkAndUpdateVictory: vi.fn(),
}));

describe('placeBonusRoad', () => {
  const createRoadBuilder = () => createTestPlayer({ id: 'p1' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isValidMainPhaseRoad).mockReturnValue(true);
    vi.mocked(persistGameState).mockResolvedValue(undefined);
  });

  it('completes the two-road sequence and transitions back to the main phase', async () => {
    const player = createRoadBuilder();
    const gameState = createTestGameState({
      roomId: 'room-1',
      players: [player],
      currentTurn: player.id,
      phase: 'road_building_1',
      gameMode: 'base',
      board: createTestBoard({ edges: [{ id: 'edge-1' }, { id: 'edge-2' }] }),
    });
    vi.mocked(getGameStateByRoomId)
      .mockResolvedValueOnce(gameState)
      .mockResolvedValueOnce(gameState);

    const afterFirstRoad = await placeBonusRoad('room-1', player.id, 'edge-1');
    expect(afterFirstRoad.phase).toBe('road_building_2');
    expect(afterFirstRoad.board.edges['edge-1'].owner).toBe(player.id);
    expect(player.roadsRemaining).toBe(14);

    const afterSecondRoad = await placeBonusRoad('room-1', player.id, 'edge-2');
    expect(afterSecondRoad.phase).toBe('main_phase');
    expect(afterSecondRoad.board.edges['edge-2'].owner).toBe(player.id);
    expect(player.roadsRemaining).toBe(13);
    expect(persistGameState).toHaveBeenCalledTimes(2);
  });

  it('treats a retry for an already committed road as a successful no-op', async () => {
    const player = createRoadBuilder();
    const gameState = createTestGameState({
      roomId: 'room-1',
      players: [player],
      currentTurn: player.id,
      phase: 'main_phase',
      gameMode: 'base',
      board: createTestBoard({
        edges: [{ id: 'edge-1', owner: player.id, structure: 'road' }],
      }),
    });
    vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

    const result = await placeBonusRoad('room-1', player.id, 'edge-1');

    expect(result).toBe(gameState);
    expect(player.roadsRemaining).toBe(15);
    expect(persistGameState).not.toHaveBeenCalled();
    expect(isValidMainPhaseRoad).not.toHaveBeenCalled();
  });
});
