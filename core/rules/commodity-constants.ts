/**
 * Cities & Knights Expansion - Commodity and Game Constants
 *
 * This module defines commodity types, terrain mappings, and constants
 * specific to the Cities & Knights expansion.
 */

import { TerrainType } from './board-constants';

/**
 * Commodity types produced by cities in C&K expansion
 * - paper: from forest hexes
 * - cloth: from pasture hexes
 * - coin: from mountain hexes
 */
export type CommodityType = 'paper' | 'cloth' | 'coin';

/**
 * City improvement categories (3 tracks)
 */
export type ImprovementType = 'science' | 'trade' | 'politics';

/**
 * Progress card categories (aligned with improvement types)
 */
export type ProgressCardCategory = 'science' | 'trade' | 'politics';

/**
 * Knight levels
 */
export type KnightLevel = 'basic' | 'strong' | 'mighty';

/**
 * Metropolis types (aligned with improvement tracks)
 */
export type MetropolisType = 'science' | 'trade' | 'politics';

/**
 * Event die face types
 */
export type EventDieFace = 'ship' | 'green' | 'yellow' | 'blue';

/**
 * Mapping from terrain to commodity (only cities produce commodities)
 * - Forest → Paper (science)
 * - Pasture → Cloth (trade)
 * - Mountain → Coin (politics)
 * - Hill, Field, Desert → No commodity (cities on these produce resources)
 */
export const TERRAIN_TO_COMMODITY: Partial<Record<TerrainType, CommodityType>> = {
    forest: 'paper',
    pasture: 'cloth',
    mountain: 'coin',
};

/**
 * Event die color to improvement category mapping
 */
export const EVENT_COLOR_TO_CATEGORY: Record<Exclude<EventDieFace, 'ship'>, ProgressCardCategory> = {
    green: 'science',
    yellow: 'trade',
    blue: 'politics',
};

/**
 * Cities & Knights game constants
 */
export const CK_CONSTANTS = {
    /** Victory points required to win in C&K mode */
    VICTORY_THRESHOLD: 13,

    /** Maximum level for each improvement track */
    MAX_IMPROVEMENT_LEVEL: 5,

    /** Minimum improvement level required to draw progress cards */
    MIN_LEVEL_FOR_CARD_DRAW: 3,

    /** Improvement level required to build a metropolis */
    METROPOLIS_REQUIREMENT: 4,

    /** Victory points awarded for owning a metropolis (in addition to city's 2 VP) */
    METROPOLIS_VICTORY_POINTS: 2,

    /** Number of hexes barbarian must travel before attacking */
    BARBARIAN_ATTACK_POSITION: 7,

    /** Knight strength values by level */
    KNIGHT_STRENGTH: {
        basic: 1,
        strong: 2,
        mighty: 3,
    } as const,

    /** Maximum number of knight pieces per level per player */
    KNIGHT_PIECE_LIMITS: {
        basic: 2,
        strong: 2,
        mighty: 2,
    } as const,
} as const;

/**
 * Commodity costs for upgrading improvements (current level + 1)
 * Level 0→1: 1 commodity
 * Level 1→2: 2 commodities
 * Level 2→3: 3 commodities
 * Level 3→4: 4 commodities
 * Level 4→5: 5 commodities
 */
export const IMPROVEMENT_UPGRADE_COSTS: Record<number, number> = {
    0: 1, // 0→1
    1: 2, // 1→2
    2: 3, // 2→3
    3: 4, // 3→4
    4: 5, // 4→5
};

/**
 * Resource cost to place a knight (sheep + ore)
 */
export const KNIGHT_COST = {
    sheep: 1,
    ore: 1,
} as const;

/**
 * Resource cost to activate a knight (wheat)
 */
export const KNIGHT_ACTIVATION_COST = {
    wheat: 1,
} as const;

/**
 * Resource cost to upgrade a knight
 * Basic→Strong: 1 sheep + 1 ore
 * Strong→Mighty: 1 sheep + 1 ore
 */
export const KNIGHT_UPGRADE_COST = {
    sheep: 1,
    ore: 1,
} as const;
