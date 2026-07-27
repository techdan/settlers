/**
 * Centralized type exports
 * This file provides a single import point for all game types
 */

// Player types
export type { DevCardPlayOptions, DevCardType, PlayerColor, PlayerState } from './player';

// Board types
export type { Vertex, Edge, BoardHex, BoardState, Port, PortType } from './board';

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
