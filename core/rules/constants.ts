/**
 * Game constants and configuration
 */

export const GAME_CONSTANTS = {
    /** Victory points needed to win */
    VICTORY_POINTS_TO_WIN: 10,

    /** Starting pieces per player */
    STARTING_PIECES: {
        settlements: 5,
        cities: 4,
        roads: 15,
    },

    /** Minimum road length for longest road */
    MIN_LONGEST_ROAD_LENGTH: 5,

    /** Minimum knights for largest army */
    MIN_LARGEST_ARMY_COUNT: 3,

    /** Victory points from special cards */
    VP_FROM_LONGEST_ROAD: 2,
    VP_FROM_LARGEST_ARMY: 2,
    VP_FROM_SETTLEMENT: 1,
    VP_FROM_CITY: 2,
    VP_FROM_DEV_CARD: 1,

    /** Discard threshold */
    DISCARD_THRESHOLD: 7,

    /** Bank trade ratios */
    DEFAULT_TRADE_RATIO: 4, // 4:1
    GENERIC_PORT_RATIO: 3,  // 3:1
    RESOURCE_PORT_RATIO: 2, // 2:1

    /** Development card deck composition */
    DEV_CARD_DECK: {
        knight: 14,
        victory_point: 5,
        road_building: 2,
        year_of_plenty: 2,
        monopoly: 2,
    },
} as const;

/**
 * Number of players
 */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

/**
 * Dice configuration
 */
export const DICE_MIN = 1;
export const DICE_MAX = 6;
export const ROBBER_ROLL = 7;
