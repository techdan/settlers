import { CardConfig } from '../types/CardConfig';
import { buildResourceOptions, buildCommodityOptions } from '../utilities/InteractionBuilder';

/**
 * Simple progress card definitions
 * These cards use declarative effects and don't require custom logic
 *
 * CLASSIFICATION:
 * - Instant Effect (no interaction): Irrigation, Mining
 * - Requires Parameter Selection: Resource Monopoly, Trade Monopoly
 * - Complex/Multi-step: All others (handled by Command pattern)
 */
export const SIMPLE_CARD_CONFIGS: CardConfig[] = [
  /**
   * SCIENCE CARDS - Instant Effects
   */
  {
    type: 'irrigation',
    category: 'science',
    isVictoryPoint: false,
    requiresInteraction: false,
    effects: [
      {
        type: 'add_resource_per_hex',
        resource: 'wheat',
        hexTerrain: 'field',
        requiresAdjacentBuilding: true,
        amountPerHex: 2,
      },
    ],
  },
  {
    type: 'mining',
    category: 'science',
    isVictoryPoint: false,
    requiresInteraction: false,
    effects: [
      {
        type: 'add_resource_per_hex',
        resource: 'ore',
        hexTerrain: 'mountain',
        requiresAdjacentBuilding: true,
        amountPerHex: 2,
      },
    ],
  },

  /**
   * TRADE CARDS - Require Parameter Selection
   */
  {
    type: 'resource_monopoly',
    category: 'trade',
    isVictoryPoint: false,
    requiresInteraction: true,
    interaction: {
      type: 'select_resource',
      prompt: 'Choose a resource to steal from all opponents (up to 2 from each)',
      options: buildResourceOptions(),
      minSelections: 1,
      maxSelections: 1,
      allowCancel: true,
    },
    effects: [
      {
        type: 'steal_from_opponents',
        cardType: 'resource',
        maxPerOpponent: 2,
        requiresSelection: true,
      },
    ],
  },
  {
    type: 'trade_monopoly',
    category: 'trade',
    isVictoryPoint: false,
    requiresInteraction: true,
    interaction: {
      type: 'select_commodity',
      prompt: 'Choose a commodity to steal from all opponents (1 from each)',
      options: buildCommodityOptions(),
      minSelections: 1,
      maxSelections: 1,
      allowCancel: true,
    },
    effects: [
      {
        type: 'steal_from_opponents',
        cardType: 'commodity',
        maxPerOpponent: 1,
        requiresSelection: true,
      },
    ],
  },

  /**
   * VICTORY POINT CARDS - No Effects
   */
  {
    type: 'printer',
    category: 'science',
    isVictoryPoint: true,
    requiresInteraction: false,
    effects: [], // VP cards have no effects - played immediately for 1 VP
  },
  {
    type: 'constitution',
    category: 'politics',
    isVictoryPoint: true,
    requiresInteraction: false,
    effects: [], // VP cards have no effects - played immediately for 1 VP
  },
];

/**
 * Get a card configuration by type
 */
export function getCardConfig(type: string): CardConfig | undefined {
  return SIMPLE_CARD_CONFIGS.find((config) => config.type === type);
}

/**
 * Check if a card type is a simple config-driven card
 */
export function isSimpleCard(type: string): boolean {
  return SIMPLE_CARD_CONFIGS.some((config) => config.type === type);
}
