import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { getCardMetadata } from '@/core/engine/progress/progress-card-definitions';
import { recordTheftEvent } from '@/core/engine/theft-events';

/**
 * Espionage Card Command
 * Politics card: Look at opponent's progress cards and steal 1
 *
 * Legacy implementation: executeEspionage() (lines 1460-1488)
 */
export class EspionageCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const commandOptions =
      typeof options === 'object' && options !== null
        ? (options as Record<string, unknown>)
        : {};
    const opponentId =
      typeof commandOptions.opponentId === 'string'
        ? commandOptions.opponentId
        : undefined;
    const stolenCard =
      typeof commandOptions.stolenCard === 'string'
        ? commandOptions.stolenCard
        : undefined;

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

    const index = opponent.progressCards.findIndex((card) => card === stolenCard);
    if (index === -1) {
      throw new Error('Opponent does not have this card');
    }

    // Remove card from opponent
    const [selectedCard] = opponent.progressCards.splice(index, 1);

    // Add to player's hand
    if (!player.progressCards) {
      player.progressCards = [];
    }
    player.progressCards.push(selectedCard);

    // Get card metadata for logging
    const cardMeta = getCardMetadata(selectedCard);

    recordTheftEvent(state, {
      source: 'espionage',
      victimId: opponent.id,
      thiefId: playerId,
      items: [{ type: 'progress_card', value: selectedCard, count: 1 }],
      victims: [{
        victimId: opponent.id,
        items: [{ type: 'progress_card', value: selectedCard, count: 1 }],
      }],
    });

    addLog(state, `stole ${cardMeta.name} from ${opponent.name}`, playerId);

    return state;
  }
}
