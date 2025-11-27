import { ResourceType } from '../board-data';
import type { CommodityType, ImprovementType, MetropolisType } from '@/core/rules/commodity-constants';

/**
 * Player-related types
 */

export type PlayerColor = 'red' | 'blue' | 'white' | 'orange';

export interface PlayerState {
    id: string;
    name: string;
    color: PlayerColor;
    resources: Record<ResourceType, number>;
    devCards: Record<DevCardType, number>;
    settlementsRemaining: number;
    citiesRemaining: number;
    roadsRemaining: number;
    victoryPoints: number;
    knightsPlayed: number;
    discardedThisTurn?: boolean;
    hasPlayedDevCard: boolean;
    devCardsBoughtThisTurn: DevCardType[];

    // Cities & Knights expansion fields (optional for backward compatibility)
    commodities?: Record<CommodityType, number>;
    improvements?: Record<ImprovementType, number>; // 0-5 for each track
    progressCards?: ProgressCardType[]; // Progress cards in hand (max 4 at end of turn)
    revealedVPCards?: ProgressCardType[]; // VP cards (Printer, Constitution) - auto-played and revealed
    knights?: Knight[];
    metropolisOwned?: MetropolisType[]; // Which metropolises this player owns
    activeKnightCount?: number; // Cache of active knight strength for barbarian calculations
    defenderVPTokens: number; // Physical VP tokens earned from Defender of Catan (permanent, not transferable)
    // Note: City walls are stored in vertex.hasCityWall, not here
}

/**
 * Development card types
 */
export type DevCardType =
    | 'knight'
    | 'victory_point'
    | 'road_building'
    | 'year_of_plenty'
    | 'monopoly';

/**
 * Cities & Knights - Progress card types
 * Science (green): 10 cards
 * Trade (yellow): 6 cards
 * Politics (blue): 9 cards
 */
export type ProgressCardType =
    // Science cards (green)
    | 'alchemist'
    | 'crane'
    | 'engineer'
    | 'inventor'
    | 'irrigation'
    | 'medicine'
    | 'mining'
    | 'printer'
    | 'road_building_progress' // Different from dev card road_building
    | 'smith'
    // Trade cards (yellow)
    | 'commercial_harbor'
    | 'guild_dues'
    | 'merchant'
    | 'merchant_fleet'
    | 'resource_monopoly'
    | 'trade_monopoly'
    // Politics cards (blue)
    | 'constitution'
    | 'diplomat'
    | 'encouragement'
    | 'espionage'
    | 'intrigue'
    | 'saboteur'
    | 'taxation'
    | 'treason'
    | 'wedding';

/**
 * Cities & Knights - Knight unit
 */
export interface Knight {
    id: string;
    vertexId: string; // Location on board
    playerId: string;
    level: 'basic' | 'strong' | 'mighty';
    active: boolean; // Active knights contribute to defense
}
