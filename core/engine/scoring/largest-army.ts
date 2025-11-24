import { GameState } from '@/lib/types';
import { GAME_CONSTANTS } from '@/core/rules/constants';

/**
 * Update largest army ownership
 *
 * @param gameState - Current game state
 * @returns Updated game state (mutated)
 */
export function updateLargestArmy(gameState: GameState): void {
    const armyCounts = gameState.players.map(p => ({
        playerId: p.id,
        count: p.knightsPlayed
    }));

    // Sort by count descending
    armyCounts.sort((a, b) => b.count - a.count);

    const largest = armyCounts[0];

    // Must have at least 3 knights to claim
    if (largest.count < GAME_CONSTANTS.MIN_LARGEST_ARMY_COUNT) {
        gameState.largestArmyOwner = null;
        return;
    }

    // Check for tie
    if (armyCounts.length > 1 && armyCounts[1].count === largest.count) {
        // Tie - current owner keeps it (or null if no current owner)
        if (gameState.largestArmyOwner &&
            armyCounts.find(a => a.playerId === gameState.largestArmyOwner)?.count === largest.count) {
            // Current owner is tied, they keep it
            return;
        }
    }

    // Award to player with most knights (or take away if no longer qualifies)
    gameState.largestArmyOwner = largest.playerId;
}
