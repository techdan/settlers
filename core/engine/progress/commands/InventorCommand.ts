import { GameState } from '@/lib/types/game';
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

  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const { hex1Id, hex2Id } = options || {};
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

    // Validate tokens exist
    if (!token1 || !token2) {
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

    addLog(
      state,
      `swapped number tokens between two hexes (${token1} <-> ${token2})`,
      playerId
    );

    return state;
  }
}
