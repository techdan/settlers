import { GameState } from '@/lib/types';
import { GAME_CONSTANTS } from './constants';

/**
 * Check if a player has won the game
 */
export function checkVictoryCondition(gameState: GameState): string | null {
    for (const player of gameState.players) {
        if (player.victoryPoints >= GAME_CONSTANTS.VICTORY_POINTS_TO_WIN) {
            return player.id;
        }
    }
    return null;
}

/**
 * Calculate a player's public victory points
 * (excluding hidden VP dev cards)
 */
export function calculatePublicVictoryPoints(
    gameState: GameState,
    playerId: string
): number {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 0;

    let points = 0;

    // Settlements
    const settlementsBuilt = GAME_CONSTANTS.STARTING_PIECES.settlements - player.settlementsRemaining;
    points += settlementsBuilt * GAME_CONSTANTS.VP_FROM_SETTLEMENT;

    // Cities  
    const citiesBuilt = GAME_CONSTANTS.STARTING_PIECES.cities - player.citiesRemaining;
    points += citiesBuilt * GAME_CONSTANTS.VP_FROM_CITY;

    // Longest Road
    if (gameState.longestRoadOwner === playerId) {
        points += GAME_CONSTANTS.VP_FROM_LONGEST_ROAD;
    }

    // Largest Army (TODO: track this)
    // if (gameState.largestArmyOwner === playerId) {
    //     points += GAME_CONSTANTS.VP_FROM_LARGEST_ARMY;
    // }

    return points;
}
