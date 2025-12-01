/**
 * Centralized type exports
 * This file provides a single import point for all game types
 */

// Player types
export type { PlayerColor, PlayerState, DevCardType } from './player';

// Board types
export type { Vertex, Edge, BoardState } from './board';

// Game types
export type {
    GamePhase,
    GameLogEntry,
    TradeOffer,
    DiceRoll,
    DiceStats,
    DiceTotal,
    GameState
} from './game';

// Re-export for backward compatibility
export * from './player';
export * from './board';
export * from './game';
