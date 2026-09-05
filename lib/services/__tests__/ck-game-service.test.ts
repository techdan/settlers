import { describe, expect, it, vi, beforeEach } from 'vitest';
import { drawProgressCardAction, resolveBarbarianAttackAction } from '../ck-game-service';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';

vi.mock('@/lib/repositories/game-repository', () => ({
  getGameStateByRoomId: vi.fn(),
  updateGameState: vi.fn(),
}));

describe('ck-game-service', () => {
  const rewardGame = () => createTestGameState({
    players: ['Pa', 'Kaius', 'Dash'].map(id => createTestPlayer({ id, name: id })),
    currentTurn: 'Pa', phase: 'waiting_for_roll',
    pendingDefenderCardDraws: ['Pa', 'Kaius', 'Dash'],
    progressDecks: { science: ['alchemist', 'printer'], trade: ['merchant'], politics: ['diplomat'] },
  });

  it('recovers the three pending rewards and rejects a repeated claim', async () => {
    const state = rewardGame();
    vi.mocked(getGameStateByRoomId).mockResolvedValue(state);
    await drawProgressCardAction('room-1', 'Pa', 'science');
    expect(state.players[0].progressCards).toEqual(['alchemist']);
    expect(state.pendingDefenderCardDraws).toEqual(['Kaius', 'Dash']);
    await expect(drawProgressCardAction('room-1', 'Pa', 'science')).rejects.toThrow('No defender reward');
    await drawProgressCardAction('room-1', 'Kaius', 'trade');
    await drawProgressCardAction('room-1', 'Dash', 'politics');
    expect(state.pendingDefenderCardDraws).toEqual([]);
    expect(state.phase).toBe('waiting_for_roll');
    expect(updateGameState).toHaveBeenCalledTimes(3);
  });

  it('rejects out-of-order and empty-deck claims without consuming rewards', async () => {
    const state = rewardGame();
    state.progressDecks!.science = [];
    vi.mocked(getGameStateByRoomId).mockResolvedValue(state);
    await expect(drawProgressCardAction('room-1', 'Kaius', 'trade')).rejects.toThrow('preceding defender');
    await expect(drawProgressCardAction('room-1', 'Pa', 'science')).rejects.toThrow('No cards remaining');
    expect(state.pendingDefenderCardDraws).toEqual(['Pa', 'Kaius', 'Dash']);
    expect(updateGameState).not.toHaveBeenCalled();
  });

  it('reveals a VP reward immediately and clears its obligation', async () => {
    const state = rewardGame();
    state.progressDecks!.science = ['printer'];
    vi.mocked(getGameStateByRoomId).mockResolvedValue(state);
    await drawProgressCardAction('room-1', 'Pa', 'science');
    expect(state.players[0].revealedVPCards).toEqual(['printer']);
    expect(state.players[0].progressCards).toEqual([]);
    expect(state.pendingDefenderCardDraws).toEqual(['Kaius', 'Dash']);
  });

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
