import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Wedding Card Command
 * Politics card: Each opponent with more VP must give you up to 2 cards
 * This creates a pendingWedding state that requires opponent responses
 *
 * Legacy implementation: executeWedding() (lines 1706-1757)
 */

interface WeddingGiftRequest {
  playerId: string;
  requiredCards: number;
  status: 'pending' | 'completed' | 'skipped';
}

export class WeddingCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Find opponents with more victory points
    const playerVP = player.victoryPoints ?? 0;
    const higherVPOpponents = state.players.filter(
      (p) => p.id !== playerId && (p.victoryPoints ?? 0) > playerVP
    );

    // Clear any stale Wedding state
    state.pendingWedding = undefined;

    // Check if any opponents qualify
    if (higherVPOpponents.length === 0) {
      addLog(
        state,
        'played Wedding but no opponents have more victory points',
        playerId
      );
      return state;
    }

    // Import resource utilities
    const { getTotalCardCount } = require('@/core/engine/progress/utilities/ResourceTransfer');

    // Create requests for each qualifying opponent
    const requests: WeddingGiftRequest[] = higherVPOpponents.map((opponent) => {
      const availableCards = getTotalCardCount(opponent);
      const requiredCards = Math.min(2, availableCards);
      return {
        playerId: opponent.id,
        requiredCards,
        status: requiredCards === 0 ? 'skipped' : 'pending',
      };
    });

    const pendingCount = requests.filter((r) => r.status === 'pending').length;

    // Check if any opponents have cards to give
    if (pendingCount === 0) {
      addLog(
        state,
        'played Wedding but eligible opponents have no cards to give',
        playerId
      );
      return state;
    }

    // Create pendingWedding state for multiplayer interaction
    state.pendingWedding = {
      initiatorId: playerId,
      requests,
    };

    addLog(
      state,
      `played Wedding. Waiting for ${pendingCount} opponent${
        pendingCount === 1 ? '' : 's'
      } with more VP to give cards`,
      playerId
    );

    return state;
  }
}
