import { GameState } from '@/lib/types';
import { getCityWallCount } from '@/core/utils/city-wall-utils';

/**
 * City Wall Validator
 * Validates city wall building
 */

/**
 * Check if a player can build a city wall at a specific vertex
 *
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to check
 * @param playerId - Player ID
 * @returns True if valid placement
 */
export function canBuildCityWall(
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

    // Cannot build wall if one already exists on this city
    if (vertex.hasCityWall) return false;

    // Cannot have more than 3 walls total
    const wallCount = getCityWallCount(gameState, playerId);
    if (wallCount >= 3) return false;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;

    // Must have 2 brick
    if (player.resources.brick < 2) return false;

    return true;
}
