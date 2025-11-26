import { GameState, PlayerState } from '@/lib/types';
import { calculateKnightStrength } from '@/core/engine/knights/knight-manager';

/**
 * Barbarian Manager (Cities & Knights Expansion)
 * Handles barbarian track advancement and attack resolution
 *
 * Barbarian rules:
 * - Advances when event die shows ship (handled by event-die-manager)
 * - Attacks at position 7, then resets to 0
 * - If totalKnightStrength >= totalCities: defenders win
 *   - Strongest defender (most knight strength) draws a progress card
 * - If totalKnightStrength < totalCities: attackers win
 *   - Weakest player (fewest knight strength, tiebreaker: most cities) loses a city
 * - Metropolises are immune to destruction
 */

/**
 * Resolve barbarian attack
 * Compares total knight strength vs total cities
 * Updates game state with attack results
 *
 * @param gameState - Current game state
 */
export function resolveBarbbarianAttack(gameState: GameState): void {
    // Calculate totals
    const totalCities = getTotalCities(gameState);
    const totalKnightStrength = getTotalKnightStrength(gameState);

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Barbarian attack! Cities: ${totalCities}, Knight Strength: ${totalKnightStrength}`
    });

    if (totalKnightStrength >= totalCities) {
        // Defenders win
        handleDefendersWin(gameState);
    } else {
        // Attackers win
        handleAttackersWin(gameState);
    }

    // Reset barbarian position to 0
    gameState.barbarianPosition = 0;

    // Return to main phase
    gameState.phase = 'main_phase';
}

/**
 * Handle defenders win scenario
 * Strongest defender draws a progress card
 *
 * @param gameState - Current game state
 */
function handleDefendersWin(gameState: GameState): void {
    const defender = getDefenderOfCatan(gameState);

    if (!defender) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: 'Defenders repelled the barbarian attack! No single defender of Catan.'
        });
        return;
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Defenders repelled the barbarian attack! ${defender.name} is the Defender of Catan and draws a progress card.`,
        playerId: defender.id
    });

    // Note: Actual progress card draw will be handled by the service layer
    // The service will need to let the player choose which category to draw from
}

/**
 * Handle attackers win scenario
 * Weakest player loses a city (downgraded to settlement)
 *
 * @param gameState - Current game state
 */
function handleAttackersWin(gameState: GameState): void {
    const weakest = getWeakestPlayer(gameState);

    if (!weakest) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: 'Barbarians attacked but no cities were lost (no valid target).'
        });
        return;
    }

    // Destroy one city
    const destroyed = destroyCity(gameState, weakest);

    if (destroyed) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Barbarians sacked the city! ${weakest.name} loses a city.`,
            playerId: weakest.id
        });
    } else {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Barbarians attacked ${weakest.name} but no cities could be destroyed.`,
            playerId: weakest.id
        });
    }
}

/**
 * Get the total number of cities in the game
 * Includes both regular cities and metropolises
 *
 * @param gameState - Current game state
 * @returns Total city count
 */
export function getTotalCities(gameState: GameState): number {
    let total = 0;

    for (const vertex of Object.values(gameState.board.vertices)) {
        if (vertex.structure === 'city' || vertex.structure === 'metropolis') {
            total++;
        }
    }

    return total;
}

/**
 * Get the total knight strength across all players
 * Only counts active knights
 *
 * @param gameState - Current game state
 * @returns Total knight strength
 */
export function getTotalKnightStrength(gameState: GameState): number {
    return gameState.players.reduce((total, player) => {
        return total + calculateKnightStrength(player);
    }, 0);
}

/**
 * Get the defender of Catan (player with most active knight strength)
 * Returns null if tie or no knights
 *
 * @param gameState - Current game state
 * @returns Player with most knight strength, or null if tie
 */
export function getDefenderOfCatan(gameState: GameState): PlayerState | null {
    let maxStrength = 0;
    let defender: PlayerState | null = null;
    let tieExists = false;

    for (const player of gameState.players) {
        const strength = calculateKnightStrength(player);

        if (strength > maxStrength) {
            maxStrength = strength;
            defender = player;
            tieExists = false;
        } else if (strength === maxStrength && strength > 0) {
            tieExists = true;
        }
    }

    // If tie, no single defender
    if (tieExists) return null;

    // If no one has knights, no defender
    if (maxStrength === 0) return null;

    return defender;
}

/**
 * Get the weakest player (player with fewest active knights)
 * Tiebreaker: player with most cities loses
 * Returns null if no players have cities
 *
 * @param gameState - Current game state
 * @returns Weakest player, or null if none
 */
export function getWeakestPlayer(gameState: GameState): PlayerState | null {
    // Filter to players who have cities
    const playersWithCities = gameState.players.filter(player => {
        return Object.values(gameState.board.vertices).some(
            vertex => vertex.owner === player.id &&
                      (vertex.structure === 'city' || vertex.structure === 'metropolis')
        );
    });

    if (playersWithCities.length === 0) return null;

    // Find minimum knight strength
    let minStrength = Infinity;
    for (const player of playersWithCities) {
        const strength = calculateKnightStrength(player);
        if (strength < minStrength) {
            minStrength = strength;
        }
    }

    // Get all players tied for weakest
    const weakestPlayers = playersWithCities.filter(
        player => calculateKnightStrength(player) === minStrength
    );

    // If only one weakest player, return them
    if (weakestPlayers.length === 1) {
        return weakestPlayers[0];
    }

    // Tiebreaker: most cities
    let maxCities = 0;
    let weakest: PlayerState | null = null;

    for (const player of weakestPlayers) {
        const cityCount = getCityCount(gameState, player.id);
        if (cityCount > maxCities) {
            maxCities = cityCount;
            weakest = player;
        }
    }

    return weakest;
}

/**
 * Get the number of cities a player has
 * Includes both regular cities and metropolises
 *
 * @param gameState - Current game state
 * @param playerId - Player ID
 * @returns Number of cities
 */
export function getCityCount(gameState: GameState, playerId: string): number {
    return Object.values(gameState.board.vertices).filter(
        vertex => vertex.owner === playerId &&
                  (vertex.structure === 'city' || vertex.structure === 'metropolis')
    ).length;
}

/**
 * Destroy one city belonging to a player
 * Downgrades city to settlement (skips metropolises)
 * Returns true if a city was destroyed
 *
 * @param gameState - Current game state
 * @param player - Player losing the city
 * @returns true if a city was destroyed
 */
export function destroyCity(gameState: GameState, player: PlayerState): boolean {
    // Find all cities (not metropolises) owned by this player
    const cities = Object.values(gameState.board.vertices).filter(
        vertex => vertex.owner === player.id && vertex.structure === 'city'
    );

    if (cities.length === 0) return false;

    // Destroy the first city found (downgrade to settlement)
    const city = cities[0];
    city.structure = 'settlement';

    // Update player resources (city → settlement conversion)
    // Give back 1 city piece, use 1 settlement piece
    player.citiesRemaining++;
    player.settlementsRemaining--;

    return true;
}

/**
 * Advance the barbarian position
 * Typically called when event die shows ship
 * Triggers attack if position reaches 7
 *
 * @param gameState - Current game state
 * @returns New barbarian position
 */
export function advanceBarbarian(gameState: GameState): number {
    if (gameState.barbarianPosition === undefined) {
        gameState.barbarianPosition = 0;
    }

    gameState.barbarianPosition++;

    return gameState.barbarianPosition;
}

/**
 * Reset barbarian position to 0
 * Called after an attack is resolved
 *
 * @param gameState - Current game state
 */
export function resetBarbarianPosition(gameState: GameState): void {
    gameState.barbarianPosition = 0;
}
