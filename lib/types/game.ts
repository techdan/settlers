import { ResourceType } from '../board-data';
import { PlayerState, DevCardType, ProgressCardType } from './player';
import { BoardState } from './board';
import type { MetropolisType, EventDieFace } from '@/core/rules/commodity-constants';

/**
 * Game mode selection
 */
export type GameMode = 'base' | 'cities_and_knights';

/**
 * Game phases
 */
export type GamePhase =
    | 'setup_round_1_settlement'
    | 'setup_round_1_road'
    | 'setup_round_2_settlement'
    | 'setup_round_2_road'
    | 'waiting_for_roll'
    | 'main_phase'
    | 'discarding'
    | 'robber_placement'
    | 'stealing'
    | 'road_building_1'
    | 'road_building_2'
    // Cities & Knights specific phases
    | 'knight_movement'
    | 'knight_displacement'
    | 'barbarian_attack'
    | 'aqueduct_selection' // New phase for Aqueduct ability
    | 'game_over';

/**
 * Game log entry
 */
export interface GameLogEntry {
    id: string;
    timestamp: number;
    message: string;
    playerId?: string; // Optional: associate log with a player
}

/**
 * Trade offer
 */
export interface TradeOffer {
    id: string;
    initiator: string;
    give: Record<ResourceType, number>;
    get: Record<ResourceType, number>;
    status: 'open' | 'accepted' | 'cancelled';
    acceptedBy?: string;
}

/**
 * Dice roll result
 */
export interface DiceRoll {
    d1: number;
    d2: number;
    total: number;
}

/**
 * Cities & Knights - Event die result
 */
export interface EventDieRoll {
    face: EventDieFace;
    timestamp: number;
}

/**
 * Cities & Knights - Metropolis ownership
 */
export interface MetropolisState {
    type: MetropolisType;
    owner: string | null; // Player ID or null if unclaimed
    vertexId: string | null; // Location on board
}

/**
 * Cities & Knights - Progress card deck
 */
export interface ProgressDeck {
    science: ProgressCardType[];
    trade: ProgressCardType[];
    politics: ProgressCardType[];
}

/**
 * Complete game state
 */
export interface GameState {
    id: string;
    roomId: string;
    players: PlayerState[];
    board: BoardState;
    currentTurn: string; // Player ID
    turnOrder: string[]; // Array of Player IDs
    phase: GamePhase;
    winner: string | null;
    lastPlacedSettlementId: string | null; // For setup phase road validation
    robberHexId: string | null; // ID of the hex where the robber is
    diceRoll?: DiceRoll;
    devCardDeck: DevCardType[];
    tradeOffer?: TradeOffer | null;
    longestRoadOwner: string | null;
    longestRoadLength: number;
    largestArmyOwner: string | null;
    logs: GameLogEntry[];

    // Cities & Knights expansion fields (optional for backward compatibility)
    gameMode?: GameMode; // Default to 'base' if not set
    barbarianPosition?: number; // 0-7, attacks at 7
    metropolises?: Partial<Record<MetropolisType, MetropolisState>>; // 3 metropolises (science, trade, politics) indexed by type
    progressDecks?: ProgressDeck; // Three decks of progress cards
    eventDieRoll?: EventDieRoll; // Last event die roll result
    merchantHexId?: string | null; // Hex where merchant is placed (provides 2:1 trade)
    activeMerchant?: string | null; // Player ID who has active Merchant progress card (grants 1 VP)
    activeEffects?: any[]; // Active progress card effects (e.g., Alchemist, Crane, Medicine)
    pendingDisplacement?: {
        knightId: string;
        playerId: string;
        originVertexId: string;
        previousPhase: GamePhase;
    };
    pendingDefenderCardDraws?: string[]; // List of player IDs who need to draw a progress card (tied defenders)
    pendingAqueduct?: string[]; // List of player IDs eligible for Aqueduct (must choose a resource)
}
