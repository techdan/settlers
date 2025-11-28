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
 * Note: Barbarians do NOT cause card discards (city walls have no effect here)
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

    // Deactivate all knights after the attack (win or lose)
    deactivateAllKnights(gameState);

    // Reset barbarian position to 0
    gameState.barbarianPosition = 0;

    // Return to main phase
    gameState.phase = 'main_phase';
}

/**
 * Handle defenders win scenario
 * v2.1: Single highest contributor gets a permanent VP token (+1 VP)
 * If tied, no token awarded - tied players draw progress cards instead
 *
 * @param gameState - Current game state
 */
function handleDefendersWin(gameState: GameState): void {
    // Get all players with their knight strengths
    const playerStrengths = gameState.players.map(player => ({
        player,
        strength: calculateKnightStrength(player)
    })).filter(ps => ps.strength > 0); // Only players who contributed

    if (playerStrengths.length === 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: 'Defenders repelled the barbarian attack! (No active knights contributed)'
        });
        return;
    }

    // Find max strength
    const maxStrength = Math.max(...playerStrengths.map(ps => ps.strength));

    // Get all players with max strength
    const topDefenders = playerStrengths.filter(ps => ps.strength === maxStrength);

    if (topDefenders.length === 1) {
        // Single highest contributor: award permanent VP token
        const defender = topDefenders[0].player;
        defender.defenderVPTokens += 1;

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Defenders repelled the barbarian attack! ${defender.name} earned a Defender of Catan token! (+1 VP, total: ${defender.defenderVPTokens})`,
            playerId: defender.id
        });
    } else {
        // Tied for highest: no token, each tied player draws a progress card
        const defenderNames = topDefenders.map(pd => pd.player.name).join(', ');

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Defenders repelled the barbarian attack! ${defenderNames} tied for highest defense (${maxStrength} strength) - each may draw a progress card.`
        });

        // Note: Actual progress card draw will be handled by the service layer
        // The service will need to let each tied player choose which category to draw from
        // Store tied defenders in a temporary field for the service to process
        gameState.pendingDefenderCardDraws = topDefenders.map(pd => pd.player.id);
    }
}

/**
 * Handle attackers win scenario
 * Weakest player loses a city (downgraded to settlement)
 *
 * @param gameState - Current game state
 */
/**
 * Handle attackers win scenario
 * v2.1: Fallback targeting system
 * 1. Group players by knight strength
 * 2. Start with weakest group (lowest strength)
 * 3. Check if ANY player in group has a destroyable city
 * 4. If yes: ALL players in this group with destroyable cities lose one. Attack ends.
 * 5. If no: Move to next weakest group and repeat.
 * 6. If no one has destroyable cities (all settlements/metropolises), nothing happens.
 *
 * @param gameState - Current game state
 */
function handleAttackersWin(gameState: GameState): void {
    // 1. Calculate strength for all players
    const playerStrengths = gameState.players.map(player => ({
        player,
        strength: calculateKnightStrength(player)
    }));

    // 2. Group by strength
    const strengthGroups = new Map<number, PlayerState[]>();
    playerStrengths.forEach(({ player, strength }) => {
        if (!strengthGroups.has(strength)) {
            strengthGroups.set(strength, []);
        }
        strengthGroups.get(strength)!.push(player);
    });

    // 3. Sort strengths ascending
    const sortedStrengths = Array.from(strengthGroups.keys()).sort((a, b) => a - b);

    let citiesDestroyed = false;
    const victims: string[] = [];

    // 4. Iterate groups to find valid targets
    for (const strength of sortedStrengths) {
        const group = strengthGroups.get(strength)!;

        // Check if ANY player in this group has a destroyable city
        const groupHasTarget = group.some(p => hasDestroyableCity(gameState, p.id));

        if (groupHasTarget) {
            // This group is the target. All eligible players lose a city.
            for (const player of group) {
                if (hasDestroyableCity(gameState, player.id)) {
                    const destroyed = destroyCity(gameState, player);
                    if (destroyed) {
                        citiesDestroyed = true;
                        victims.push(player.name);

                        gameState.logs.push({
                            id: `${Date.now()}-${Math.random()}`,
                            timestamp: Date.now(),
                            message: `Barbarians sacked the city! ${player.name} loses a city.`,
                            playerId: player.id
                        });
                    }
                } else {
                    // Player is in the weakest group but has no city to lose (immune)
                    gameState.logs.push({
                        id: `${Date.now()}-${Math.random()}`,
                        timestamp: Date.now(),
                        message: `Barbarians attacked ${player.name} (weakest) but they have no destroyable cities.`,
                        playerId: player.id
                    });
                }
            }
            // Attack resolved (do not proceed to next strength)
            break;
        } else {
            // No one in this group has a city. Log and continue to next group.
            /* 
            // Optional: Log that this group was skipped? 
            // "Barbarians ignored [Players] (strength X) as they have no cities."
            // Might be too spammy.
            */
        }
    }

    if (!citiesDestroyed) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: 'Barbarians attacked but no cities were lost (no valid targets found among any players).'
        });
    }
}

/**
 * Check if a player has any destroyable city (regular city, not metropolis)
 */
function hasDestroyableCity(gameState: GameState, playerId: string): boolean {
    return Object.values(gameState.board.vertices).some(
        v => v.owner === playerId && v.structure === 'city'
    );
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
 * Also removes city wall if present
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
    city.hasCityWall = false; // Wall is destroyed when city is downgraded

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

/**
 * Deactivate all knights after barbarian attack
 * All active knights become inactive (win or lose)
 *
 * @param gameState - Current game state
 */
function deactivateAllKnights(gameState: GameState): void {
    let totalDeactivated = 0;

    for (const player of gameState.players) {
        if (!player.knights) continue;

        for (const knight of player.knights) {
            if (knight.active) {
                knight.active = false;
                totalDeactivated++;
            }
        }

        // Update cached knight strength (should now be 0)
        player.activeKnightCount = 0;
    }

    if (totalDeactivated > 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `All ${totalDeactivated} active knights have been deactivated after the barbarian attack.`
        });
    }
}
