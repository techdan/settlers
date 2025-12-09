import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';

/**
 * Guild Dues Card Command
 * Trade card: Take up to 2 cards from an opponent with more VP
 * Takes 2 normally, or 1 if opponent only has 1 card
 *
 * Legacy implementation: executeGuildDues() (lines 1306-1383)
 */
export class GuildDuesCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const opponentId = options?.opponentId as string | undefined;
    const card1Type = options?.card1Type as 'resource' | 'commodity' | undefined;
    const card1Value = options?.card1Value as string | undefined;
    const card2Type = options?.card2Type as 'resource' | 'commodity' | undefined;
    const card2Value = options?.card2Value as string | undefined;

    if (!opponentId || !card1Type || !card1Value) {
      throw new Error('Guild Dues requires selecting an opponent and at least one card');
    }

    const opponent = state.players.find((p) => p.id === opponentId);
    if (!opponent) {
      throw new Error('Opponent not found');
    }

    // Calculate available cards
    const availableCards =
      Object.values(opponent.resources || {}).reduce((sum, n) => sum + (n || 0), 0) +
      Object.values(opponent.commodities || {}).reduce((sum, n) => sum + (n || 0), 0);

    if (availableCards === 0) {
      throw new Error('Opponent has no cards to take');
    }

    // Build requested cards list
    const requested = [
      { type: card1Type, value: card1Value },
      ...(card2Type && card2Value ? [{ type: card2Type, value: card2Value }] : []),
    ];

    const requiredCount = Math.min(2, availableCards);
    if (requested.length !== requiredCount) {
      throw new Error(
        `Guild Dues requires selecting ${requiredCount} card${
          requiredCount === 1 ? '' : 's'
        } from opponent's hand`
      );
    }

    // Count requested cards
    const requestedCounts: Record<string, number> = {};
    for (const pick of requested) {
      const key = `${pick.type}:${pick.value}`;
      requestedCounts[key] = (requestedCounts[key] || 0) + 1;
    }

    // Validate opponent has all requested cards
    const { addResources, removeResources } = require('@/core/engine/resources/resource-manager');

    for (const [key, count] of Object.entries(requestedCounts)) {
      const [type, rawValue] = key.split(':');
      if (type === 'resource') {
        const available = opponent.resources[rawValue as ResourceType] ?? 0;
        if (available < count) {
          throw new Error('Opponent does not have that resource');
        }
      } else {
        const available = opponent.commodities?.[rawValue as CommodityType] ?? 0;
        if (available < count) {
          throw new Error('Opponent does not have that commodity');
        }
      }
    }

    // Transfer cards
    for (const pick of requested) {
      if (pick.type === 'resource') {
        removeResources(opponent, { [pick.value]: 1 });
        addResources(player, { [pick.value]: 1 });
      } else {
        if (!opponent.commodities) opponent.commodities = { paper: 0, cloth: 0, coin: 0 };
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        opponent.commodities[pick.value as CommodityType] -= 1;
        player.commodities[pick.value as CommodityType] += 1;
      }
    }

    // Update theft tracking
    const takenCount = requested.length;
    const stolenItems = Object.entries(requestedCounts).map(([key, count]) => {
      const [type, value] = key.split(':');
      return {
        type: type as 'resource' | 'commodity',
        value: value as ResourceType | CommodityType,
        count,
      };
    });

    state.lastTheft = {
      victimId: opponent.id,
      thiefId: playerId,
      items: stolenItems,
      victims: [{ victimId: opponent.id, items: stolenItems }],
      timestamp: Date.now(),
    };

    addLog(
      state,
      `took ${takenCount} card${takenCount === 1 ? '' : 's'} from ${opponent.name}'s hand`,
      playerId
    );

    return state;
  }
}
