import { CardConfig } from '../types/CardConfig';

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
    requiresInteraction: true, // Player must select resource type
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
    requiresInteraction: true, // Player must select commodity type
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
