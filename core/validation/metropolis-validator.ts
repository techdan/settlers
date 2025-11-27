import { GameState } from '@/lib/types';

/**
 * Validate metropolis placement
 * 
 * Rules:
 * 1. Vertex must exist
 * 2. Must be player's own city
 * 3. Must not already be a metropolis
 * 
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to place metropolis
 * @param playerId - Player attempting to place
 * @param type - Type of metropolis
 * @returns true if valid placement
 */
export function isValidMetropolisPlacement(
    gameState: GameState,
    vertexId: string,
    playerId: string,
    type: 'science' | 'trade' | 'politics'
): boolean {
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;

    // Must be own city
    if (vertex.owner !== playerId) return false;
    if (vertex.structure !== 'city') return false;

    // TODO: Check if player has required improvement level (handled in logic usually, but validator can check too)
    // TODO: Check if metropolis of this type is available or can be stolen

    return true;
}
