import { GameState } from '@/lib/types/game';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Espionage Card Command
 * Politics card: Look at opponent's progress cards and steal 1
 *
 * Legacy implementation: executeEspionage() (lines 1460-1488)
 */
export class EspionageCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const opponentId = options?.opponentId as string | undefined;
    const stolenCard = options?.stolenCard as ProgressCardType | undefined;

    if (!opponentId || !stolenCard) {
      throw new Error('Espionage requires selecting an opponent and a card to steal');
    }

    const opponent = state.players.find((p) => p.id === opponentId);
    if (!opponent) {
      throw new Error('Opponent not found');
    }

    // Validate opponent has the card
    if (!opponent.progressCards || opponent.progressCards.length === 0) {
      throw new Error('Opponent has no progress cards');
    }

    const index = opponent.progressCards.indexOf(stolenCard);
    if (index === -1) {
      throw new Error('Opponent does not have this card');
    }

    // Remove card from opponent
    opponent.progressCards.splice(index, 1);

    // Add to player's hand
    if (!player.progressCards) {
      player.progressCards = [];
    }
    player.progressCards.push(stolenCard);

    // Get card metadata for logging
    const { getCardMetadata } = require('@/core/engine/progress/progress-card-definitions');
    const cardMeta = getCardMetadata(stolenCard);

    addLog(state, `stole ${cardMeta.name} from ${opponent.name}`, playerId);

    return state;
  }
}
