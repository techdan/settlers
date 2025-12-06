import { GameState, PlayerState, MetropolisState } from '@/lib/types';
import { MetropolisType, CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';

/**
 * Metropolis Manager (Cities & Knights Expansion)
 * Handles metropolis building, ownership transfer, and VP calculation
 *
 * Rules:
 * - 3 metropolises exist: science, trade, politics
 * - Requires level 4+ in corresponding improvement track
 * - Provides +2 VP in addition to city's 2 VP (total 4 VP per metropolis)
 * - Exclusive ownership: only one player can own each metropolis
 * - Can be stolen if another player reaches higher improvement level
 * - Immune to barbarian destruction
 */

/**
 * Initialize metropolises in game state
 *
 * @param gameState - Current game state
 */
export function initializeMetropolises(gameState: GameState): void {
    if (!gameState.metropolises) {
        gameState.metropolises = {
            science: { type: 'science', owner: null, vertexId: null },
            trade: { type: 'trade', owner: null, vertexId: null },
            politics: { type: 'politics', owner: null, vertexId: null },
        };
    }
}

/**
 * Get metropolis state for a specific type
 *
 * @param gameState - Current game state
 * @param type - Metropolis type
 * @returns Metropolis state or null
 */
export function getMetropolis(gameState: GameState, type: MetropolisType): MetropolisState | null {
    if (!gameState.metropolises) return null;
    return gameState.metropolises[type] || null;
}

/**
 * Check if a player can build/claim a metropolis
 *
 * @param gameState - Current game state
 * @param playerId - Player ID
 * @param type - Metropolis type (science/trade/politics)
 * @param vertexId - Vertex where city is located
 * @returns true if player can build metropolis
 */
export function canBuildMetropolis(
    gameState: GameState,
    playerId: string,
    type: MetropolisType,
    vertexId: string
): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check improvement level requirement
    const improvementLevel = player.improvements?.[type] || 0;
    if (improvementLevel < CK_CONSTANTS.METROPOLIS_REQUIREMENT) {
        return false;
    }

    // Check vertex has player's city
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;
    if (vertex.owner !== playerId) return false;
    if (vertex.structure !== 'city') return false; // Must be a city, not already metropolis

    // Get metropolis state
    const metropolis = getMetropolis(gameState, type);
    if (!metropolis) return false;

    // If unclaimed, player can claim it
    if (metropolis.owner === null) {
        return true;
    }

    // If player already owns it, they can't "build" it again
    if (metropolis.owner === playerId) {
        return false;
    }

    // To steal from another player, must have HIGHER level
    const currentOwner = gameState.players.find(p => p.id === metropolis.owner);
    if (!currentOwner) return true; // Owner not found, allow claim

    const ownerLevel = currentOwner.improvements?.[type] || 0;
    return improvementLevel > ownerLevel;
}

/**
 * Build/claim a metropolis
 * Upgrades a city to metropolis and transfers ownership if stealing
 *
 * @param gameState - Current game state
 * @param playerId - Player building the metropolis
 * @param vertexId - Vertex where city is located
 * @param type - Metropolis type
 * @returns true if successfully built
 */
export function buildMetropolis(
    gameState: GameState,
    playerId: string,
    vertexId: string,
    type: MetropolisType
): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Validate can build
    if (!canBuildMetropolis(gameState, playerId, type, vertexId)) {
        return false;
    }

    initializeMetropolises(gameState);

    const metropolis = getMetropolis(gameState, type);
    if (!metropolis) return false;

    const previousOwner = metropolis.owner;

    // If stealing from another player, downgrade their metropolis
    if (previousOwner && previousOwner !== playerId) {
        downgradeMetropolis(gameState, previousOwner, type);
    }

    // Upgrade city to metropolis
    const vertex = gameState.board.vertices[vertexId];
    vertex.structure = 'metropolis';

    // Update metropolis ownership
    metropolis.owner = playerId;
    metropolis.vertexId = vertexId;

    // Update player's metropolis list
    if (!player.metropolisOwned) {
        player.metropolisOwned = [];
    }
    if (!player.metropolisOwned.includes(type)) {
        player.metropolisOwned.push(type);
    }

    // Log the action
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    if (previousOwner) {
        const prevOwnerName = gameState.players.find(p => p.id === previousOwner)?.name;
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} stole the ${typeName} Metropolis from ${prevOwnerName}!`,
            playerId
        });
    } else {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} built the ${typeName} Metropolis!`,
            playerId
        });
    }

    // Update all players' victory points to reflect metropolis changes
    updateAllVictoryPoints(gameState);

    return true;
}

/**
 * Downgrade a metropolis back to a city
 * Called when metropolis is stolen by another player
 *
 * @param gameState - Current game state
 * @param playerId - Player losing the metropolis
 * @param type - Metropolis type
 */
export function downgradeMetropolis(
    gameState: GameState,
    playerId: string,
    type: MetropolisType
): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const metropolis = getMetropolis(gameState, type);
    if (!metropolis || metropolis.owner !== playerId) return;

    // Find the vertex with this metropolis
    if (metropolis.vertexId) {
        const vertex = gameState.board.vertices[metropolis.vertexId];
        if (vertex && vertex.structure === 'metropolis') {
            vertex.structure = 'city';
        }
    }

    // Remove from player's metropolis list
    if (player.metropolisOwned) {
        const index = player.metropolisOwned.indexOf(type);
        if (index !== -1) {
            player.metropolisOwned.splice(index, 1);
        }
    }

    // Note: No log here - the buildMetropolis function will log the steal action
}

/**
 * Check if a player owns a specific metropolis
 *
 * @param player - Player state
 * @param type - Metropolis type
 * @returns true if player owns this metropolis
 */
export function ownsMetropolis(player: PlayerState, type: MetropolisType): boolean {
    if (!player.metropolisOwned) return false;
    return player.metropolisOwned.includes(type);
}

/**
 * Get the number of metropolises a player owns
 *
 * @param player - Player state
 * @returns Number of metropolises owned
 */
export function getMetropolisCount(player: PlayerState): number {
    return player.metropolisOwned?.length || 0;
}

/**
 * Calculate victory points from metropolises
 * Each metropolis provides +2 VP in addition to the city's 2 VP
 *
 * @param player - Player state
 * @returns Total VP from metropolises (2 VP each)
 */
export function calculateMetropolisVP(player: PlayerState): number {
    return getMetropolisCount(player) * CK_CONSTANTS.METROPOLIS_VICTORY_POINTS;
}

/**
 * Check and update metropolis ownership for all players
 * Called after a player upgrades an improvement
 * Transfers metropolis if another player now has higher level
 *
 * @param gameState - Current game state
 * @param type - Improvement type that was upgraded
 */
export function checkMetropolisOwnership(
    gameState: GameState,
    type: MetropolisType
): void {
    initializeMetropolises(gameState);

    const metropolis = getMetropolis(gameState, type);
    if (!metropolis) return;

    // If no one owns it, nothing to check
    if (!metropolis.owner) return;

    const currentOwner = gameState.players.find(p => p.id === metropolis.owner);
    if (!currentOwner) return;

    const currentLevel = currentOwner.improvements?.[type] || 0;

    // Check if any other player has higher level
    for (const player of gameState.players) {
        if (player.id === currentOwner.id) continue;

        const playerLevel = player.improvements?.[type] || 0;

        // If this player has higher level, they should steal the metropolis
        if (playerLevel > currentLevel) {
            // Find a city owned by this player to place the metropolis
            const cityVertex = Object.values(gameState.board.vertices).find(
                v => v.owner === player.id && v.structure === 'city'
            );

            if (cityVertex) {
                // Steal the metropolis
                buildMetropolis(gameState, player.id, cityVertex.id, type);
                return; // Only one player can steal
            }
        }
    }
}

/**
 * Get all metropolis data for display
 *
 * @param gameState - Current game state
 * @returns Array of metropolis states
 */
export function getAllMetropolises(gameState: GameState): MetropolisState[] {
    initializeMetropolises(gameState);
    if (!gameState.metropolises) return [];
    return Object.values(gameState.metropolises).filter((m): m is MetropolisState => m !== undefined && m !== null);
}
