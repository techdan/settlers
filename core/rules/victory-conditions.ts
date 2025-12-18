import { GameState } from '@/lib/types';
import { GAME_CONSTANTS } from './constants';
import { CK_CONSTANTS } from './commodity-constants';
import { calculateMetropolisVP } from '@/core/engine/metropolis/metropolis-manager';
import { isVictoryPointCard } from '@/core/engine/progress/progress-card-definitions';

/**
 * Get victory point threshold based on game mode
 */
function getVictoryThreshold(gameState: GameState): number {
    if (gameState.gameMode === 'cities_and_knights') {
        return CK_CONSTANTS.VICTORY_THRESHOLD; // 13 VP
    }
    return GAME_CONSTANTS.VICTORY_POINTS_TO_WIN; // 10 VP
}

/**
 * Check if a player has won the game
 */
export function checkVictoryCondition(gameState: GameState): string | null {
    const threshold = getVictoryThreshold(gameState);

    for (const player of gameState.players) {
        if (player.victoryPoints >= threshold) {
            return player.id;
        }
    }
    return null;
}

/**
 * Calculate a player's total victory points
 * (including all sources)
 */
export function calculateTotalVictoryPoints(
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

    // Victory Point Dev Cards
    // - Hidden VP dev cards remain in `player.devCards.victory_point`
    // - Revealed VP dev cards are tracked separately (public) for UI display
    points += (player.devCards.victory_point || 0) + (player.revealedDevCardVictoryPoints || 0);

    // Longest Road
    if (gameState.longestRoadOwner === playerId) {
        points += GAME_CONSTANTS.VP_FROM_LONGEST_ROAD;
    }

    // Largest Army (NOT in C&K mode)
    if (gameState.gameMode !== 'cities_and_knights' && gameState.largestArmyOwner === playerId) {
        points += GAME_CONSTANTS.VP_FROM_LARGEST_ARMY;
    }

    // Cities & Knights: Metropolises
    if (gameState.gameMode === 'cities_and_knights') {
        points += calculateMetropolisVP(player);

        // Cities & Knights: VP Progress Cards (Printer, Constitution)
        if (player.revealedVPCards) {
            points += player.revealedVPCards.length; // Each VP card = 1 VP
        }

        // Cities & Knights: Merchant (grants 1 VP)
        if (gameState.activeMerchant === playerId) {
            points += 1;
        }

        // Cities & Knights: Defender of Catan VP Tokens
        if (player.defenderVPTokens) {
            points += player.defenderVPTokens; // Each token = 1 VP
        }
    }

    return points;
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

    // Revealed VP dev cards are public; hidden VP dev cards are excluded from public scoring.
    points += player.revealedDevCardVictoryPoints || 0;

    // Longest Road
    if (gameState.longestRoadOwner === playerId) {
        points += GAME_CONSTANTS.VP_FROM_LONGEST_ROAD;
    }

    // Largest Army (NOT in C&K mode)
    if (gameState.gameMode !== 'cities_and_knights' && gameState.largestArmyOwner === playerId) {
        points += GAME_CONSTANTS.VP_FROM_LARGEST_ARMY;
    }

    // Cities & Knights: Metropolises (public)
    if (gameState.gameMode === 'cities_and_knights') {
        points += calculateMetropolisVP(player);

        // Cities & Knights: VP Progress Cards (public - revealed cards)
        if (player.revealedVPCards) {
            points += player.revealedVPCards.length; // Each VP card = 1 VP
        }

        // Cities & Knights: Merchant (public - grants 1 VP)
        if (gameState.activeMerchant === playerId) {
            points += 1;
        }

        // Cities & Knights: Defender of Catan VP Tokens (public)
        if (player.defenderVPTokens) {
            points += player.defenderVPTokens; // Each token = 1 VP
        }
    }

    return points;
}

/**
 * Update all players' victory points based on current game state
 * This should be called whenever victory points might change:
 * - After building/upgrading
 * - After playing dev cards
 * - After longest road/largest army changes
 */
export function updateAllVictoryPoints(gameState: GameState): void {
    for (const player of gameState.players) {
        player.victoryPoints = calculateTotalVictoryPoints(gameState, player.id);
    }
}
