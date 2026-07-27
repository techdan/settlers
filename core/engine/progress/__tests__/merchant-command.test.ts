import { describe, expect, it, vi, beforeEach } from 'vitest';

// Allow merchant placement without board adjacency complexity
vi.mock(
  '@/core/engine/progress/utilities/BoardScanning',
  () => ({
    hasAdjacentBuilding: vi.fn(() => true),
  })
);

import { MerchantCommand } from '../commands/MerchantCommand';
import { createHex } from '@/lib/hex';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';

describe('MerchantCommand', () => {
  let command: MerchantCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    command = new MerchantCommand();
  });

  it('places merchant and recalculates VP immediately', () => {
    const player = createTestPlayer({
      id: 'p1',
      name: 'Player 1',
      settlementsRemaining: 4, // 1 settlement built
      citiesRemaining: 3, // 1 city built
    });

    const gameState = createTestGameState({
      players: [player],
      board: createTestBoard({
        hexes: [{
          id: '0,0',
          hex: createHex(0, 0),
          terrain: 'forest',
          numberToken: 8,
        }],
      }),
      gameMode: 'cities_and_knights',
    });

    command.execute(gameState, 'p1', { hexId: '0,0' });

    expect(gameState.activeMerchant).toBe('p1');
    expect(gameState.merchantHexId).toBe('0,0');
    // 1 settlement (1) + 1 city (2) + merchant VP (1) = 4
    expect(gameState.players[0].victoryPoints).toBe(4);
  });
});
