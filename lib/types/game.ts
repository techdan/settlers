import { ResourceType } from '@/core/rules/board-constants';
import { PlayerState, DevCardType, ProgressCardType, Knight } from './player';
import { BoardState } from './board';
import type { MetropolisType, EventDieFace, CommodityType } from '@/core/rules/commodity-constants';
import type { ActiveEffect } from '@/lib/types/effects';
import type { TimerConfig, TurnExtensionTracking } from './timer';

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
    | 'barbarian_city_selection' // Players choose which city to lose
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
 * Trade offer - supports both resources and commodities
 */
export interface TradeOffer {
    id: string;
    initiator: string;
    give: Record<ResourceType, number>;
    get: Record<ResourceType, number>;
    giveCommodities?: Record<CommodityType, number>; // Optional commodity support
    getCommodities?: Record<CommodityType, number>; // Optional commodity support
    status: 'open' | 'accepted' | 'cancelled';
    acceptedBy?: string;
    rejectedBy?: string[]; // Track which players have rejected the trade
}

/**
 * Dice roll result
 */
export interface DiceRoll {
    d1: number;
    d2: number;
    total: number;
}

export type DiceTotal = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DiceStats = Record<DiceTotal, number>;
export type EventDieStats = Record<EventDieFace, number>;

export const DICE_TOTALS: readonly DiceTotal[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const EVENT_DIE_FACES: readonly EventDieFace[] = ['ship', 'science', 'trade', 'politics'];

export const EMPTY_DICE_STATS: DiceStats = DICE_TOTALS.reduce((acc, total) => {
    acc[total] = 0;
    return acc;
}, {} as DiceStats);
export const EMPTY_EVENT_DIE_STATS: EventDieStats = EVENT_DIE_FACES.reduce((acc, face) => {
    acc[face] = 0;
    return acc;
}, {} as EventDieStats);

/**
 * Cities & Knights - Event die result
 */
export interface EventDieRoll {
    face: EventDieFace;
    timestamp: number;
}

export interface VictoryPointCardGain {
    playerId: string;
    cardType: ProgressCardType;
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

export interface CommercialHarborState {
    initiatorId: string;
    offers: {
        targetPlayerId: string;
        offeredResource: ResourceType | null; // null means "No Trade"
        response?: CommodityType | null; // undefined = not responded yet, null = no commodities
    }[];
}

export interface TreasonEffect {
    type: 'treason';
    initiatorId: string;
    targetPlayerId: string;
    stage: 'awaiting_knight' | 'awaiting_placement';
    removedKnight?: {
        id: string;
        level: Knight['level'];
        active: boolean;
        vertexId: string;
    };
}

export type WeddingGiftItem = {
    type: 'resource' | 'commodity';
    value: ResourceType | CommodityType;
    count: number;
};

export type WeddingSelection = {
    type: 'resource' | 'commodity';
    value: ResourceType | CommodityType;
};

export interface WeddingGiftRequest {
    playerId: string;
    requiredCards: number;
    status: 'pending' | 'completed' | 'skipped';
    given?: WeddingGiftItem[];
}

export interface WeddingState {
    initiatorId: string;
    requests: WeddingGiftRequest[];
}

export type DiscardContext =
    | { type: 'robber' }
    | { type: 'sabotage'; initiatorId: string; targetIds: string[] };

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
    aqueductResumePhase?: GamePhase; // Phase to return to after Aqueduct selections resolve
    winner: string | null;
    lastPlacedSettlementId: string | null; // For setup phase road validation
    robberHexId: string | null; // ID of the hex where the robber is
    diceRoll?: DiceRoll;
    diceStats?: DiceStats;
    eventDieStats?: EventDieStats;
    devCardDeck: DevCardType[];
    tradeOffer?: TradeOffer | null;
    longestRoadOwner: string | null;
    longestRoadLength: number;
    largestArmyOwner: string | null;
    logs: GameLogEntry[];

    // Cities & Knights expansion fields (optional for backward compatibility)
    gameMode?: GameMode; // Default to 'base' if not set
    barbarianPosition?: number; // 0-7, attacks at 7
    hasBarbariansAttacked?: boolean; // C&K: True if barbarians have attacked at least once
    skipFirstBarbarianAttack?: boolean; // C&K: Skip the first barbarian attack (fairness rule from lobby)
    metropolises?: Partial<Record<MetropolisType, MetropolisState>>; // 3 metropolises (science, trade, politics) indexed by type
    progressDecks?: ProgressDeck; // Three decks of progress cards
    eventDieRoll?: EventDieRoll; // Last event die roll result
    merchantHexId?: string | null; // Hex where merchant is placed (provides 2:1 trade)
    activeMerchant?: string | null; // Player ID who has active Merchant progress card (grants 1 VP)
    activeEffects?: ActiveEffect[]; // Active progress card effects (e.g., Alchemist, Crane, Medicine)
    pendingDisplacement?: {
        knightId: string;
        playerId: string;
        originVertexId: string;
        previousPhase: GamePhase;
    };
    pendingDefenderCardDraws?: string[]; // List of player IDs who need to draw a progress card (tied defenders)
    pendingAqueduct?: string[]; // List of player IDs eligible for Aqueduct (must choose a resource)
    pendingBarbarianVictims?: string[]; // List of player IDs who must choose a city to lose to barbarians
    pendingRobberAfterBarbarian?: boolean; // True if a 7 was rolled during barbarian attack and robber handling is deferred
    pendingCommercialHarbor?: CommercialHarborState; // Pending Commercial Harbor trades awaiting responses
    pendingWedding?: WeddingState; // Pending Wedding gifts awaiting opponent selections
    lastTheft?: {
        source?: 'robber' | 'wedding' | 'taxation' | 'guild_dues';
        victimId?: string;
        thiefId: string;
        items?: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; count: number }[];
        victims?: {
            victimId: string;
            items: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; count: number }[];
        }[];
        timestamp: number;
    };
    lastTrade?: {
        initiatorId: string;
        acceptorId: string;
        initiatorGave: {
            resources: Record<ResourceType, number>;
            commodities?: Record<CommodityType, number>;
        };
        initiatorReceived: {
            resources: Record<ResourceType, number>;
            commodities?: Record<CommodityType, number>;
        };
        timestamp: number;
    };
    lastVPCardGain?: VictoryPointCardGain;
    discardContext?: DiscardContext;

    // Turn timer state (added for turn timer feature)
    timerConfig?: TimerConfig;                              // Timer configuration (copied from lobby)
    turnStartTime?: number;                                 // Unix timestamp (ms) when turn began
    timerServerTime?: number;                               // Server clock sample (ms), refreshed with authoritative state
    timerClockOffsetMs?: number;                            // Client-only offset from local clock to timerServerTime
    turnTimeLimit?: number;                                 // Effective limit for current turn (base + extensions)
    timerLocked?: boolean;                                  // Is turn in locked state (timeout reached)?
    playerTimeBanks?: Record<string, number>;               // Remaining bank per player (seconds)
    playerTotalTime?: Record<string, number>;               // Total time played per player (seconds)
    currentTurnExtensions?: TurnExtensionTracking;          // Extension tracking (current turn only)
}
