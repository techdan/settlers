import { GameState } from '@/lib/types/game';
import type { ResourceType } from '@/core/rules/board-constants';
import { getResourceFromTerrain } from '@/core/rules/game-rules';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Inventor Card Command
 * Science card: Swap any two number tokens except 2, 6, 8, or 12
 *
 * Legacy implementation: executeInventor() (lines 750-793)
 */
export class InventorCommand implements ProgressCardCommand {
  private static readonly RESTRICTED_NUMBERS = [2, 6, 8, 12];
  private static readonly TOKEN_PIPS: Record<number, number> = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  };
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const commandOptions =
      typeof options === 'object' && options !== null
        ? (options as Record<string, unknown>)
        : {};
    const hex1Id =
      typeof commandOptions.hex1Id === 'string'
        ? commandOptions.hex1Id
        : undefined;
    const hex2Id =
      typeof commandOptions.hex2Id === 'string'
        ? commandOptions.hex2Id
        : undefined;
    if (!hex1Id || !hex2Id) {
      throw new Error('Inventor requires selecting two hexes to swap');
    }

    // Find hexes
    const hex1 = state.board.hexes.find((h) => h.id === hex1Id);
    const hex2 = state.board.hexes.find((h) => h.id === hex2Id);

    if (!hex1 || !hex2) {
      throw new Error('Invalid hex selection for Inventor');
    }

    const token1 = hex1.numberToken;
    const token2 = hex2.numberToken;
    const resource1 = getResourceFromTerrain(hex1.terrain);
    const resource2 = getResourceFromTerrain(hex2.terrain);

    // Validate tokens exist
    if (!token1 || !token2 || !resource1 || !resource2) {
      throw new Error('Cannot swap desert or ocean hexes');
    }

    // Check that tokens are not restricted
    if (
      InventorCommand.RESTRICTED_NUMBERS.includes(token1) ||
      InventorCommand.RESTRICTED_NUMBERS.includes(token2)
    ) {
      throw new Error('Cannot swap number tokens 2, 6, 8, or 12');
    }

    // Perform the swap
    hex1.numberToken = token2;
    hex2.numberToken = token1;

    // Update pips if present
    if (typeof hex1.pips === 'number') {
      hex1.pips = InventorCommand.TOKEN_PIPS[token2] ?? hex1.pips;
    }
    if (typeof hex2.pips === 'number') {
      hex2.pips = InventorCommand.TOKEN_PIPS[token1] ?? hex2.pips;
    }

    const timestamp = Date.now();
    state.lastInventorSwap = {
      id: `${timestamp}-${Math.random()}`,
      playerId,
      hexes: [
        {
          id: hex1.id,
          resource: resource1,
          before: token1,
          after: token2,
        },
        {
          id: hex2.id,
          resource: resource2,
          before: token2,
          after: token1,
        },
      ],
      timestamp,
    };

    addLog(
      state,
      `${player.name} used Inventor: ${InventorCommand.formatResourceSquare(resource1)} ${token1} → ${token2}; ${InventorCommand.formatResourceSquare(resource2)} ${token2} → ${token1}`,
      playerId
    );

    return state;
  }

  private static formatResourceSquare(resource: ResourceType): string {
    return `${resource.charAt(0).toUpperCase()}${resource.slice(1)} square`;
  }
}
