import { ResourceType } from '../board-data';
import { PlayerState, DevCardType } from './player';
import { BoardState } from './board';

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
}
