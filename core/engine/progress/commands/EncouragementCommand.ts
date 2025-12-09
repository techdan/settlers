import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Encouragement Card Command
 * Politics card: Activate all your knights for free
 *
 * Legacy implementation: executeEncouragement() (lines 1759-1782)
 */
export class EncouragementCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.knights || player.knights.length === 0) {
      throw new Error('You have no knights to activate');
    }

    let activatedCount = 0;
    for (const knight of player.knights) {
      if (!knight.active) {
        knight.active = true;
        activatedCount++;
      }
    }

    // Refresh cached barbarian defense strength after activation
    this.updateActiveKnightCount(player);

    addLog(
      state,
      `activated ${activatedCount} knights with Encouragement`,
      playerId
    );

    return state;
  }

  /**
   * Update the active knight count cache on the player
   * This matches the legacy updateActiveKnightCount() function
   */
  private updateActiveKnightCount(player: any): void {
    if (!player.knights) {
      player.activeKnightCount = 0;
      return;
    }

    const activeCount = player.knights.filter(
      (k: any) => k.active
    ).length;
    player.activeKnightCount = activeCount;
  }
}
