import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { hasAdjacentBuilding } from '@/core/engine/progress/utilities/BoardScanning';
import { updateAllVictoryPoints, checkVictoryCondition } from '@/core/rules/victory-conditions';

/**
 * Merchant Card Command
 * Trade card: Place the merchant on a hex adjacent to your settlement/city
 * The merchant grants 2:1 trade with bank for that resource + 1 VP
 *
 * Legacy implementation: executeMerchant() (lines 863-899)
 */
export class MerchantCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const hexId =
      typeof options === 'object' &&
      options !== null &&
      'hexId' in options &&
      typeof options.hexId === 'string'
        ? options.hexId
        : undefined;
    if (!hexId) {
      throw new Error('Merchant requires selecting a hex to place the merchant');
    }

    // Find the hex
    const hex = state.board.hexes.find((h) => h.id === hexId);
    if (!hex) {
      throw new Error('Invalid hex selection for Merchant');
    }

    // Validate hex is adjacent to player's settlement/city
    if (!hasAdjacentBuilding(state, hex.id, playerId)) {
      throw new Error('Merchant must be placed on a hex adjacent to your settlement or city');
    }

    // Place the merchant
    state.merchantHexId = hexId;
    state.activeMerchant = playerId; // Track who has active Merchant (grants 1 VP)

    // Update victory points to reflect the merchant VP
    updateAllVictoryPoints(state);

    addLog(
      state,
      `placed the merchant on a ${hex.terrain} hex (2:1 trade + 1 VP)`,
      playerId
    );

    const winnerId = checkVictoryCondition(state);
    if (winnerId) {
      state.winner = winnerId;
      state.phase = 'game_over';
    }

    return state;
  }
}
