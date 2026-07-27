import type { GameState } from '@/lib/types/game';
import type { ProgressCardCommand } from '../types/CardConfig';
import { getTotalResources } from '../../resources/resource-manager';
import { addLog } from '../utilities/StateManagement';

/**
 * Saboteur Card Command
 * Politics card: Each opponent with equal or more VP must discard half their resource cards
 *
 * This creates a discardContext and changes phase to 'discarding' for opponent responses
 *
 * Legacy implementation: executeSaboteur() (lines 1660-1704)
 */
export class SaboteurCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState;
  execute(state: GameState, playerId: string): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Find opponents with equal or more victory points
    const playerVP = player.victoryPoints ?? 0;
    const targets = state.players.filter(
      (p) => p.id !== playerId && (p.victoryPoints ?? 0) >= playerVP
    );

    // Clear any stale discard tracking/context
    state.discardContext = undefined;
    state.players.forEach((p) => (p.discardedThisTurn = false));

    // Check if any opponents qualify
    if (targets.length === 0) {
      addLog(
        state,
        'played Saboteur but no opponents have equal or more victory points',
        playerId
      );
      return state;
    }

    // Check if any targets have resources
    const targetsWithCards = targets.filter((opponent) => getTotalResources(opponent) > 0);
    if (targetsWithCards.length === 0) {
      addLog(
        state,
        'played Saboteur but affected opponents have no resource cards to discard',
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
