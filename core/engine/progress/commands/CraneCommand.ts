import type { GameState } from '@/lib/types/game';
import type { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import type { ImprovementType } from '@/core/rules/commodity-constants';
import {
  upgradeImprovement,
} from '../../improvements/improvement-manager';

function getImprovementOption(options: unknown): ImprovementType | undefined {
  if (typeof options !== 'object' || options === null) return undefined;

  const improvement = (options as Record<string, unknown>).improvement;
  if (
    improvement === 'science' ||
    improvement === 'trade' ||
    improvement === 'politics'
  ) {
    return improvement;
  }

  return undefined;
}

/**
 * Crane Card Command
 * Science card: Build one city improvement for 1 commodity less
 *
 * Legacy implementation: executeCrane() (lines 581-605)
 */
export class CraneCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const improvement = getImprovementOption(options);
    if (!improvement) {
      throw new Error('Crane requires selecting an improvement to upgrade');
    }

    // Upgrade with 1 commodity discount
    const discount = 1;
    const newLevel = upgradeImprovement(player, improvement, discount);

    if (newLevel === -1) {
      throw new Error('Failed to upgrade improvement with Crane');
    }

    addLog(
      state,
      `used Crane to upgrade ${improvement} to level ${newLevel} (cost reduced by 1 commodity)`,
      playerId
    );

    return state;
  }
}
