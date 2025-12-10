import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { isMerchantFleetEffect } from '@/lib/types/effects';

type MerchantFleetOptions = {
  tradeItem: ResourceType | CommodityType;
};

/**
 * Merchant Fleet Card Command
 * Trade card: Choose a resource or commodity to trade with the bank at 2:1 this turn
 *
 * Legacy implementation: executeMerchantFleet() (lines 901-930)
 */
export class MerchantFleetCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: MerchantFleetOptions): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const tradeItem = options?.tradeItem;
    const validItems: (ResourceType | CommodityType)[] = [
      'wood',
      'brick',
      'sheep',
      'wheat',
      'ore',
      'paper',
      'cloth',
      'coin',
    ];

    if (!tradeItem || !validItems.includes(tradeItem)) {
      throw new Error('Merchant Fleet requires selecting a resource or commodity');
    }

    // Initialize activeEffects array if not present
    if (!state.activeEffects) {
      state.activeEffects = [];
    }

    // Remove any existing merchant fleet effect for this player
    state.activeEffects = state.activeEffects.filter(
      effect => !(isMerchantFleetEffect(effect) && effect.playerId === playerId)
    );

    // Add new merchant fleet effect (expires after this player's turn)
    state.activeEffects.push({
      type: 'merchant_fleet',
      playerId: playerId,
      tradeItem,
      expiresAfterTurn: playerId,
    });

    addLog(
      state,
      `chose ${tradeItem} for Merchant Fleet (2:1 with the bank this turn)`,
      playerId
    );

    return state;
  }
}
