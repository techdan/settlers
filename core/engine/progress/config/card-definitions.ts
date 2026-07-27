import { CardConfig } from '../types/CardConfig';
import { buildResourceOptions, buildCommodityOptions } from '../utilities/InteractionBuilder';
import type { ProgressCardType } from '@/lib/types/player';

export type ProgressCardModalSurface = 'board-visible' | 'blocking';

export type ProgressCardInteraction =
  | {
      mode: 'direct';
    }
  | {
      mode: 'modal';
      surface: ProgressCardModalSurface;
      requiresParameters: boolean;
    }
  | {
      mode: 'hex';
    }
  | {
      mode: 'vertex';
    }
  | {
      mode: 'edge';
    }
  | {
      mode: 'custom';
    }
  | {
      mode: 'road-placement';
    }
  | {
      mode: 'commercial-harbor';
    };

/**
 * Client interaction routing for every progress card.
 *
 * This is the single source of truth for whether a card opens a modal, starts a
 * board selection, starts a custom flow, or plays immediately. Components may
 * derive group membership from `mode`; do not reintroduce parallel card lists.
 */
export const PROGRESS_CARD_INTERACTIONS = {
  alchemist: { mode: 'modal', surface: 'board-visible', requiresParameters: true },
  crane: { mode: 'custom' },
  engineer: { mode: 'custom' },
  inventor: { mode: 'hex' },
  irrigation: { mode: 'modal', surface: 'board-visible', requiresParameters: false },
  medicine: { mode: 'custom' },
  mining: { mode: 'modal', surface: 'board-visible', requiresParameters: false },
  printer: { mode: 'direct' },
  road_building_progress: { mode: 'road-placement' },
  smith: { mode: 'custom' },
  commercial_harbor: { mode: 'commercial-harbor' },
  guild_dues: { mode: 'modal', surface: 'blocking', requiresParameters: true },
  merchant: { mode: 'hex' },
  merchant_fleet: { mode: 'modal', surface: 'board-visible', requiresParameters: true },
  resource_monopoly: { mode: 'modal', surface: 'board-visible', requiresParameters: true },
  trade_monopoly: { mode: 'modal', surface: 'board-visible', requiresParameters: true },
  constitution: { mode: 'direct' },
  diplomat: { mode: 'edge' },
  encouragement: { mode: 'modal', surface: 'blocking', requiresParameters: false },
  espionage: { mode: 'modal', surface: 'blocking', requiresParameters: true },
  intrigue: { mode: 'vertex' },
  saboteur: { mode: 'modal', surface: 'blocking', requiresParameters: false },
  taxation: { mode: 'hex' },
  treason: { mode: 'custom' },
  wedding: { mode: 'modal', surface: 'blocking', requiresParameters: false },
} satisfies Record<ProgressCardType, ProgressCardInteraction>;

export type ProgressCardInteractionMode = ProgressCardInteraction['mode'];

export type ProgressCardsWithMode<
  Mode extends ProgressCardInteractionMode,
> = {
  [CardType in ProgressCardType]: (typeof PROGRESS_CARD_INTERACTIONS)[CardType] extends {
    mode: Mode;
  }
    ? CardType
    : never;
}[ProgressCardType];

export function getProgressCardInteraction<CardType extends ProgressCardType>(
  cardType: CardType
): (typeof PROGRESS_CARD_INTERACTIONS)[CardType] {
  return PROGRESS_CARD_INTERACTIONS[cardType];
}

export function hasProgressCardFollowup(cardType: ProgressCardType): boolean {
  return getProgressCardInteraction(cardType).mode !== 'direct';
}

export function hasProgressCardInteractionMode<
  Mode extends ProgressCardInteractionMode,
>(
  cardType: ProgressCardType,
  mode: Mode
): cardType is ProgressCardsWithMode<Mode> {
  return getProgressCardInteraction(cardType).mode === mode;
}

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
