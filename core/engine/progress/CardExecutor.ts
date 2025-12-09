import { GameState } from '@/lib/types/game';
import { ProgressCardType } from '@/lib/types/player';
import { CardConfig, ProgressCardCommand } from './types/CardConfig';
import { CardEffect } from './types/CardEffect';
import { getCardConfig, isSimpleCard } from './config/card-definitions';
import {
  executeAddResourcePerHex,
  executeAddResourcePerBuilding,
  executeAddCommodityPerCity,
  executeStealFromOpponents,
} from './effects/ResourceEffects';
import {
  executeFreeRoad,
  executeFreeCityWall,
} from './effects/BuildingEffects';
import {
  executeUpgradeKnight,
  executeActivateKnight,
  executePromoteKnight,
} from './effects/KnightEffects';
import { EncouragementCommand } from './commands/EncouragementCommand';
import { EngineerCommand } from './commands/EngineerCommand';
import { SmithCommand } from './commands/SmithCommand';
import { RoadBuildingCommand } from './commands/RoadBuildingCommand';

/**
 * CardExecutor
 *
 * Executes progress cards by either:
 * 1. Running declarative config-driven effects (simple cards)
 * 2. Delegating to custom command implementations (complex cards)
 */
export class CardExecutor {
  private commands: Map<ProgressCardType, ProgressCardCommand>;

  constructor() {
    // Register complex card commands here
    this.commands = new Map();

    // Phase 3.1: Simple commands
    this.commands.set('encouragement', new EncouragementCommand());
    this.commands.set('engineer', new EngineerCommand());
    this.commands.set('smith', new SmithCommand());
    this.commands.set('road_building_progress', new RoadBuildingCommand());
  }

  /**
   * Execute a progress card
   */
  execute(
    cardType: ProgressCardType,
    state: GameState,
    playerId: string,
    options?: any
  ): GameState {
    // Check if this is a complex card with a custom command
    const command = this.commands.get(cardType);
    if (command) {
      return command.execute(state, playerId, options);
    }

    // Check if this is a simple config-driven card
    if (isSimpleCard(cardType)) {
      const config = getCardConfig(cardType);
      if (!config) {
        throw new Error(`Card configuration not found for ${cardType}`);
      }
      return this.executeConfig(config, state, playerId, options);
    }

    // Card not implemented yet
    throw new Error(`Card ${cardType} not implemented in new system`);
  }

  /**
   * Execute a config-driven card by applying its effects
   */
  private executeConfig(
    config: CardConfig,
    state: GameState,
    playerId: string,
    options?: any
  ): GameState {
    // Validate if custom validator exists
    if (config.validator && !config.validator(state, playerId)) {
      throw new Error(`Cannot play ${config.type} card - validation failed`);
    }

    // Apply each effect in sequence
    let newState = state;
    for (const effect of config.effects) {
      newState = this.applyEffect(effect, newState, playerId, options);
    }

    return newState;
  }

  /**
   * Apply a single effect to the game state
   */
  private applyEffect(
    effect: CardEffect,
    state: GameState,
    playerId: string,
    options?: any
  ): GameState {
    switch (effect.type) {
      case 'add_resource_per_hex':
        return executeAddResourcePerHex(state, playerId, effect);

      case 'add_resource_per_building':
        return executeAddResourcePerBuilding(state, playerId, effect);

      case 'add_commodity_per_city':
        return executeAddCommodityPerCity(state, playerId, effect);

      case 'steal_from_opponents':
        return executeStealFromOpponents(state, playerId, effect, options);

      case 'upgrade_knight':
        return executeUpgradeKnight(state, playerId, effect);

      case 'activate_knight':
        return executeActivateKnight(state, playerId, effect);

      case 'promote_knight':
        return executePromoteKnight(state, playerId, effect);

      case 'free_road':
        return executeFreeRoad(state, playerId, effect);

      case 'free_city_wall':
        return executeFreeCityWall(state, playerId, effect);

      case 'select_from_options':
        // TODO: Implement option selection
        throw new Error('select_from_options effect not yet implemented');

      case 'discard_opponent_cards':
        // TODO: Implement opponent card discard
        throw new Error('discard_opponent_cards effect not yet implemented');

      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = effect;
        throw new Error(`Unknown effect type: ${(_exhaustive as any).type}`);
    }
  }

}

/**
 * Create a singleton CardExecutor instance
 */
let executorInstance: CardExecutor | null = null;

export function getCardExecutor(): CardExecutor {
  if (!executorInstance) {
    executorInstance = new CardExecutor();
  }
  return executorInstance;
}
