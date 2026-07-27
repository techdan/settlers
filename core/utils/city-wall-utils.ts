import { GameState } from '@/lib/types';

/**
 * City Wall Utilities (Cities & Knights Expansion)
 * Helper functions for city wall management
 * 
 * City walls are stored as vertex.hasCityWall (per-city), not in PlayerState.
 * This ensures walls are automatically cleaned up when cities are destroyed.
 */

/**
 * Get the number of city walls a player has
 * Counts all cities/metropolises owned by player that have hasCityWall = true
 *
 * @param gameState - Current game state
 * @param playerId - Player ID
 * @returns Number of city walls owned by player
 */
export function getCityWallCount(gameState: GameState, playerId: string): number {
    return Object.values(gameState.board.vertices).filter(
        v => v.owner === playerId &&
            (v.structure === 'city' || v.structure === 'metropolis') &&
            v.hasCityWall === true
    ).length;
}

/**
 * Get the list of the player's cities/metropolises that can take a wall.
 * Optionally ignores resource cost (useful for the Engineering progress card).
 */
export function getEligibleCityWallVertices(
    gameState: GameState,
    playerId: string,
    options?: { ignoreCost?: boolean }
): string[] {
    if (getCityWallCount(gameState, playerId) >= 3) return [];

    const player = gameState.players.find(candidate => candidate.id === playerId);
    if (!options?.ignoreCost && (!player || player.resources.brick < 2)) return [];

    return Object.values(gameState.board.vertices)
        .filter(v => v.owner === playerId && (v.structure === 'city' || v.structure === 'metropolis'))
        .filter(v => !v.hasCityWall)
        .slice(0) // ensure array copy
        .map(v => v.id);
}

/**
 * Get robber discard threshold for a player
 * Base threshold is 7, each city wall adds +2
 * This ONLY applies to rolling a 7, NOT barbarian attacks
 *
 * @param gameState - Game state
 * @param playerId - Player ID
 * @returns Card threshold above which player must discard on a 7
 */
export function getRobberDiscardThreshold(gameState: GameState, playerId: string): number {
    const baseThreshold = 7;
    const wallCount = getCityWallCount(gameState, playerId);
    return baseThreshold + (wallCount * 2);
}

/**
 * Check if a specific city has a wall
 *
 * @param gameState - Game state
 * @param vertexId - Vertex ID
 * @returns True if city has a wall
 */
export function hasCityWall(gameState: GameState, vertexId: string): boolean {
    const vertex = gameState.board.vertices[vertexId];
    return vertex?.hasCityWall === true;
}
