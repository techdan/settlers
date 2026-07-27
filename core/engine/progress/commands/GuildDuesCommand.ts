import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { addResources, removeResources } from '@/core/engine/resources/resource-manager';
import { recordTheftEvent } from '@/core/engine/theft-events';

type GuildDuesCardType = 'resource' | 'commodity';

interface RequestedCard {
  type: GuildDuesCardType;
  value: string;
}

const RESOURCE_TYPES = new Set<string>(['wood', 'brick', 'sheep', 'wheat', 'ore']);
const COMMODITY_TYPES = new Set<string>(['paper', 'cloth', 'coin']);

function isResourceType(value: string): value is ResourceType {
  return RESOURCE_TYPES.has(value);
}

function isCommodityType(value: string): value is CommodityType {
  return COMMODITY_TYPES.has(value);
}

/**
 * Guild Dues Card Command
 * Trade card: Take up to 2 cards from an opponent with more VP
 * Takes 2 normally, or 1 if opponent only has 1 card
 *
 * Legacy implementation: executeGuildDues() (lines 1306-1383)
 */
export class GuildDuesCommand implements ProgressCardCommand {
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
    const card1Type =
      commandOptions.card1Type === 'resource' ||
      commandOptions.card1Type === 'commodity'
        ? commandOptions.card1Type
        : undefined;
    const card1Value =
      typeof commandOptions.card1Value === 'string'
        ? commandOptions.card1Value
        : undefined;
    const card2Type =
      commandOptions.card2Type === 'resource' ||
      commandOptions.card2Type === 'commodity'
        ? commandOptions.card2Type
        : undefined;
    const card2Value =
      typeof commandOptions.card2Value === 'string'
        ? commandOptions.card2Value
        : undefined;

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
    const requested: RequestedCard[] = [
      { type: card1Type, value: card1Value },
    ];
    if (card2Type && card2Value) {
      requested.push({ type: card2Type, value: card2Value });
    }

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
    for (const [key, count] of Object.entries(requestedCounts)) {
      const [type, rawValue] = key.split(':');
      if (type === 'resource') {
        const available = isResourceType(rawValue)
          ? opponent.resources[rawValue]
          : 0;
        if (available < count) {
          throw new Error('Opponent does not have that resource');
        }
      } else {
        const available = isCommodityType(rawValue)
          ? opponent.commodities?.[rawValue] ?? 0
          : 0;
        if (available < count) {
          throw new Error('Opponent does not have that commodity');
        }
      }
    }

    // Transfer cards
    for (const pick of requested) {
      if (pick.type === 'resource') {
        if (!isResourceType(pick.value)) {
          throw new Error('Opponent does not have that resource');
        }
        removeResources(opponent, { [pick.value]: 1 });
        addResources(player, { [pick.value]: 1 });
      } else {
        if (!isCommodityType(pick.value)) {
          throw new Error('Opponent does not have that commodity');
        }
        if (!opponent.commodities) opponent.commodities = { paper: 0, cloth: 0, coin: 0 };
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        opponent.commodities[pick.value] -= 1;
        player.commodities[pick.value] += 1;
      }
    }

    // Update theft tracking
    const takenCount = requested.length;
    const stolenItems = Object.entries(requestedCounts).map(([key, count]) => {
      const [type, value] = key.split(':');
      if (type === 'resource' && isResourceType(value)) {
        return { type: 'resource' as const, value, count };
      }
      if (type === 'commodity' && isCommodityType(value)) {
        return { type: 'commodity' as const, value, count };
      }
      throw new Error('Invalid Guild Dues card selection');
    });

    recordTheftEvent(state, {
      source: 'guild_dues',
      victimId: opponent.id,
      thiefId: playerId,
      items: stolenItems,
      victims: [{ victimId: opponent.id, items: stolenItems }],
    });

    addLog(
      state,
      `took ${takenCount} card${takenCount === 1 ? '' : 's'} from ${opponent.name}'s hand`,
      playerId
    );

    return state;
  }
}
