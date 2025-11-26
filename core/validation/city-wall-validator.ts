import { GameState } from '@/lib/types';

/**
 * City Wall Validator
 * Validates city wall placement
 */

/**
 * Check if a player can build a city wall at a vertex
 *
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to check
 * @param playerId - Player ID
 * @returns True if valid placement
 */
export function isValidCityWallPlacement(
    gameState: GameState,
    vertexId: string,
    playerId: string
): boolean {
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;

    // Must own the vertex
    if (vertex.owner !== playerId) return false;

    // Must be a city or metropolis
    if (vertex.structure !== 'city' && vertex.structure !== 'metropolis') return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Initialize cityWalls if needed
    if (!player.cityWalls) {
        player.cityWalls = [];
    }

    // Cannot build wall if one already exists on this city
    if (player.cityWalls.includes(vertexId)) return false;

    // Cannot have more than 3 walls total
    if (player.cityWalls.length >= 3) return false;

    // Must have 2 brick
    if (player.resources.brick < 2) return false;

    return true;
}
