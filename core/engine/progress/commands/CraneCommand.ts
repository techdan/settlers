import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ImprovementType } from '@/core/rules/commodity-constants';

/**
 * Crane Card Command
 * Science card: Build one city improvement for 1 commodity less
 *
 * Legacy implementation: executeCrane() (lines 581-605)
 */
export class CraneCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const improvement = options?.improvement as ImprovementType | undefined;
    if (!improvement) {
      throw new Error('Crane requires selecting an improvement to upgrade');
    }

    // Import improvement utilities
    const { upgradeImprovement, tryAwardMetropolis, tryStealMetropolis } =
      require('@/core/engine/improvements/improvement-manager');

    // Upgrade with 1 commodity discount
    const discount = 1;
    const newLevel = upgradeImprovement(player, improvement, discount);

    if (newLevel === -1) {
      throw new Error('Failed to upgrade improvement with Crane');
    }

    // Check for metropolis award/steal
    if (newLevel === 4) {
      tryAwardMetropolis(state, player, improvement);
    } else if (newLevel === 5) {
      tryStealMetropolis(state, player, improvement);
    }

    addLog(
      state,
      `used Crane to upgrade ${improvement} to level ${newLevel} (cost reduced by 1 commodity)`,
      playerId
    );

    return state;
  }
}
