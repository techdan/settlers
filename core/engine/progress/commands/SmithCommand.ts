import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { isKnightPromotable } from '@/core/utils/knight-upgrade-utils';
import { upgradeKnight } from '@/core/engine/knights/knight-manager';

/**
 * Smith Card Command (a.k.a. "Smithing")
 * Science card: Promote up to two knights for free
 *
 * Legacy implementation: executeSmith() (lines 698-743)
 */
export class SmithCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Parse knight IDs from options
    const commandOptions =
      typeof options === 'object' && options !== null
        ? (options as Record<string, unknown>)
        : {};
    const rawIds = Array.isArray(commandOptions.knightIds)
      ? commandOptions.knightIds
      : commandOptions.knightId
      ? [commandOptions.knightId]
      : [];

    const knightIds = Array.from(new Set(rawIds.filter(Boolean)));

    if (knightIds.length === 0) {
      throw new Error('Smithing requires selecting at least one of your knights to promote');
    }

    if (knightIds.length > 2) {
      throw new Error('Smithing can promote at most two knights');
    }

    if (!player.knights || player.knights.length === 0) {
      throw new Error('No knights available to promote');
    }

    // Validate all selections before mutating state to avoid partial upgrades
    const knightsToUpgrade = knightIds.map((id) => {
      const knight = player.knights?.find((k) => k.id === id);
      if (!knight) {
        throw new Error('Selected knight does not belong to you');
      }
      if (!isKnightPromotable(knight, player)) {
        if (knight.level === 'mighty') {
          throw new Error('Mighty knights cannot be promoted further');
        }
        if (knight.level === 'strong') {
          throw new Error(
            'Politics level 3 is required to promote a strong knight to mighty'
          );
        }
        throw new Error('Selected knight cannot be promoted right now');
      }
      return knight;
    });

    // Perform the promotions
    knightsToUpgrade.forEach((knight) => {
      upgradeKnight(state, knight.id);
    });

    addLog(
      state,
      `promoted ${knightsToUpgrade.length} knight${knightsToUpgrade.length !== 1 ? 's' : ''} for free with Smithing`,
      playerId
    );

    return state;
  }
}
