import { ResourceType } from '../board-data';

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
