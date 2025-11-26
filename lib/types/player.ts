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
    progressCards?: ProgressCardType[];
    knights?: Knight[];
    metropolisOwned?: MetropolisType[]; // Which metropolises this player owns
    activeKnightCount?: number; // Cache of active knight strength for barbarian calculations
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
    | 'master_merchant'
    | 'merchant'
    | 'merchant_fleet'
    | 'resource_monopoly'
    | 'trade_monopoly'
    // Politics cards (blue)
    | 'bishop'
    | 'constitution'
    | 'deserter'
    | 'diplomat'
    | 'intrigue'
    | 'saboteur'
    | 'spy'
    | 'warlord'
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
