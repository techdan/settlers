import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Saboteur Card Command
 * Politics card: Each opponent with more VP must discard half their resource cards
 *
 * This creates a discardContext and changes phase to 'discarding' for opponent responses
 *
 * Legacy implementation: executeSaboteur() (lines 1660-1704)
 */
export class SaboteurCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Find opponents with more victory points
    const playerVP = player.victoryPoints ?? 0;
    const targets = state.players.filter(
      (p) => p.id !== playerId && (p.victoryPoints ?? 0) > playerVP
    );

    // Clear any stale discard tracking/context
    state.discardContext = undefined;
    state.players.forEach((p) => (p.discardedThisTurn = false));

    // Check if any opponents qualify
    if (targets.length === 0) {
      addLog(
        state,
        'played Saboteur but no opponents have more victory points',
        playerId
      );
      return state;
    }

    // Import resource utilities
    const { getTotalResources } = require('@/core/engine/resources/resource-manager');

    // Check if any targets have resources
    const targetsWithCards = targets.filter((opponent) => getTotalResources(opponent) > 0);
    if (targetsWithCards.length === 0) {
      addLog(
        state,
        'played Saboteur but higher-VP opponents have no resource cards to discard',
        playerId
      );
      return state;
    }

    // Create discard context for multiplayer interaction
    state.discardContext = {
      type: 'sabotage',
      initiatorId: playerId,
      targetIds: targets.map((t) => t.id),
    };
    state.phase = 'discarding';

    const targetNames = targets.map((t) => t.name).join(', ');
    addLog(
      state,
      `played Saboteur. ${targetNames} must discard half their resource cards`,
      playerId
    );

    return state;
  }
}
