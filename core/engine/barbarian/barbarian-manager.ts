import { GameState, PlayerState } from '@/lib/types';
import { calculateKnightStrength } from '@/core/engine/knights/knight-manager';
import { setPhase } from '@/lib/services/timer-service';

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

    if (totalKnightStrength >= totalCities) {
        // Defenders win
        handleDefendersWin(gameState, totalCities, totalKnightStrength);

        // Deactivate all knights and reset position (defenders won)
        deactivateAllKnights(gameState);
        gameState.barbarianPosition = 0;
        setPhase(gameState, 'main_phase');
    } else {
        // Attackers win
        handleAttackersWin(gameState, totalCities, totalKnightStrength);

        // If no victims need to choose (all immune), clean up now
        if (!gameState.pendingBarbarianVictims || gameState.pendingBarbarianVictims.length === 0) {
            deactivateAllKnights(gameState);
            gameState.barbarianPosition = 0;
            setPhase(gameState, 'main_phase');
        }
        // Otherwise, phase is already set to 'barbarian_city_selection'
        // Cleanup will happen after cities are chosen
    }
}

/**
 * Handle defenders win scenario
 * v2.1: Single highest contributor gets a permanent VP token (+1 VP)
 * If tied, no token awarded - tied players draw progress cards instead
 *
 * @param gameState - Current game state
 * @param totalCities - Total cities in game
 * @param totalKnightStrength - Total active knight strength
 */
function handleDefendersWin(gameState: GameState, totalCities: number, totalKnightStrength: number): void {
    // Get all players with their knight strengths
    const playerStrengths = gameState.players.map(player => ({
        player,
        strength: calculateKnightStrength(player)
    })).filter(ps => ps.strength > 0); // Only players who contributed

    const baseMessage = `Barbarians attack! Cities: ${totalCities}, Knight Strength: ${totalKnightStrength}. Defenders win!`;

    if (playerStrengths.length === 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${baseMessage} (No active knights contributed)`
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
            message: `${baseMessage} ${defender.name} contributed the most knights and gains a Defender of Catan VP! (Total: ${defender.defenderVPTokens})`,
            playerId: defender.id
        });
    } else {
        // Tied for highest: no token, each tied player draws a progress card
        const defenderNames = topDefenders.map(pd => pd.player.name).join(', ');

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${baseMessage} ${defenderNames} tied for highest contribution (${maxStrength} strength) - each may draw a progress card.`
        });

        // Note: Actual progress card draw will be handled by the service layer
        // The service will need to let each tied player choose which category to draw from
        // Store tied defenders in a temporary field for the service to process
        gameState.pendingDefenderCardDraws = topDefenders.map(pd => pd.player.id);
    }
}

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
 * @param totalCities - Total cities in game
 * @param totalKnightStrength - Total active knight strength
 */
function handleAttackersWin(gameState: GameState, totalCities: number, totalKnightStrength: number): void {
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

    const victims: string[] = [];
    const baseMessage = `Barbarians attack! Cities: ${totalCities}, Knight Strength: ${totalKnightStrength}. Settlers lose.`;

    // 4. Iterate groups to find valid targets (Cascade rule)
    // "The penalty moves to the next lowest eligible player(s) until a city is lost"
    for (const strength of sortedStrengths) {
        const group = strengthGroups.get(strength)!;

        // Find all players in this group who CAN lose a city
        const eligibleVictimsInGroup = group.filter(p => hasDestroyableCity(gameState, p.id));

        if (eligibleVictimsInGroup.length > 0) {
            // We found at least one player who can lose a city.
            // ALL eligible players in this tie group must lose a city.
            // Those who cannot (no cities/only metropolises) are skipped.

            for (const player of eligibleVictimsInGroup) {
                victims.push(player.id);
            }

            // Log the outcome
            const victimNames = victims.map(id => gameState.players.find(p => p.id === id)?.name).join(', ');
            const skippedNames = group
                .filter(p => !victims.includes(p.id))
                .map(p => p.name)
                .join(', ');

            if (victims.length === 1) {
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${baseMessage} ${victimNames} contributed the least knights (${strength}) and must choose a city to lose.`
                });
            } else {
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${baseMessage} ${victimNames} tied for least knights (${strength}) and must each choose a city to lose.`
                });
            }

            if (skippedNames) {
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${skippedNames} also had strength ${strength} but had no destroyable cities and were skipped.`
                });
            }

            // Stop cascading. A city (or cities) will be lost.
            break;
        } else {
            // Entire group is immune.
            const groupNames = group.map(p => p.name).join(', ');
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${baseMessage} ${groupNames} (strength ${strength}) have no destroyable cities. Checking next lowest strength...`
            });
            // Continue to next strength group...
        }
    }

    if (victims.length > 0) {
        // Set up pending city selection
        gameState.pendingBarbarianVictims = victims;
        gameState.phase = 'barbarian_city_selection';
    } else {
        // We went through ALL groups and found no one with a destroyable city.
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${baseMessage} No one has a destroyable city. The barbarians leave empty-handed.`
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
 * @param vertexId - Optional specific city to destroy. If not provided, destroys first city found.
 * @returns true if a city was destroyed
 */
export function destroyCity(gameState: GameState, player: PlayerState, vertexId?: string): boolean {
    // Find all cities (not metropolises) owned by this player
    const cities = Object.values(gameState.board.vertices).filter(
        vertex => vertex.owner === player.id && vertex.structure === 'city'
    );

    if (cities.length === 0) return false;

    // Find the specific city if vertexId provided, otherwise use first city
    let city;
    if (vertexId) {
        city = cities.find(c => c.id === vertexId);
        if (!city) return false; // Specified city not found or not valid
    } else {
        city = cities[0];
    }

    // Destroy the city (downgrade to settlement)
    city.structure = 'settlement';
    city.hasCityWall = false; // Wall is destroyed when city is downgraded

    // Update player resources (city → settlement conversion)
    // Give back 1 city piece, use 1 settlement piece
    player.citiesRemaining++;
    player.settlementsRemaining--;

    return true;
}

/**
 * Handle a player choosing which city to lose to barbarians
 * Called when a player selects a city during barbarian_city_selection phase
 *
 * @param gameState - Current game state
 * @param playerId - Player ID choosing the city
 * @param vertexId - Vertex ID of the city to lose
 */
export function loseCityToBarbarians(gameState: GameState, playerId: string, vertexId: string): void {
    // Validate player is in pending victims
    if (!gameState.pendingBarbarianVictims || !gameState.pendingBarbarianVictims.includes(playerId)) {
        throw new Error('You are not required to lose a city');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Destroy the chosen city
    const destroyed = destroyCity(gameState, player, vertexId);
    if (!destroyed) {
        throw new Error('Failed to destroy city - invalid selection');
    }

    // Log the loss
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Barbarians sacked ${player.name}'s city!`,
        playerId
    });

    // Remove player from pending victims
    gameState.pendingBarbarianVictims = gameState.pendingBarbarianVictims.filter(id => id !== playerId);

    // If all victims have chosen, finish the attack
    if (gameState.pendingBarbarianVictims.length === 0) {
        // Deactivate all knights
        deactivateAllKnights(gameState);

        // Reset barbarian position
        gameState.barbarianPosition = 0;

        // Check if robber handling was deferred (7 rolled during barbarian attack)
        if (gameState.pendingRobberAfterBarbarian) {
            gameState.pendingRobberAfterBarbarian = false;
            gameState.pendingBarbarianVictims = undefined;

            // Import utilities for robber handling
            const { getRobberDiscardThreshold } = require('@/core/utils/city-wall-utils');
            const { getTotalResources } = require('@/core/engine/resources/resource-manager');
            const { getTotalCommodities } = require('@/core/engine/resources/commodity-manager');

            // Check if any players need to discard (resources + commodities count toward hand limit)
            const playersToDiscard = gameState.players.filter(p => {
                const threshold = getRobberDiscardThreshold(gameState, p.id);
                const resourceCount = getTotalResources(p);
                const commodityCount = p.commodities ? getTotalCommodities(p) : 0;
                return (resourceCount + commodityCount) > threshold;
            });

            if (playersToDiscard.length > 0) {
                // Transition to discard phase first
                gameState.discardContext = { type: 'robber' };
                setPhase(gameState, 'discarding');
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `Players exceeding their hand limit must discard half`
                });
            } else {
                // Transition to robber placement
                setPhase(gameState, 'robber_placement');
                const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${currentPlayer?.name || 'Player'} must move the robber`
                });
            }
        } else {
            // Return to main phase
            setPhase(gameState, 'main_phase');
            gameState.pendingBarbarianVictims = undefined;
        }
    }
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
