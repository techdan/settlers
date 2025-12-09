import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Commercial Harbor Card Command
 * Trade card: Initiate multiplayer trading where you can make offers to opponents
 *
 * This creates a pendingCommercialHarbor state. The actual trading logic
 * is handled by the commercial-harbor API route.
 *
 * Legacy implementation: executeCommercialHarbor() (lines 1291-1304)
 */
export class CommercialHarborCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Initialize Commercial Harbor state
    // The modal will appear for the player to make offers
    state.pendingCommercialHarbor = {
      initiatorId: playerId,
      offers: [],
    };

    addLog(state, 'played Commercial Harbor', playerId);

    return state;
  }
}
