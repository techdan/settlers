import { GameState } from '@/lib/types';
import { CK_CONSTANTS, MetropolisType } from '@/core/rules/commodity-constants';

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
    type: MetropolisType
): boolean {
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;

    // Must be own city
    if (vertex.owner !== playerId) return false;
    if (vertex.structure !== 'city') return false;

    // Player must meet improvement requirement
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    const improvementLevel = player.improvements?.[type] || 0;
    if (improvementLevel < CK_CONSTANTS.METROPOLIS_REQUIREMENT) return false;

    // Metropolis availability/steal rules
    const metropolis = gameState.metropolises?.[type];
    if (!metropolis) return false;
    if (metropolis.owner === null) return true; // Unclaimed
    if (metropolis.owner === playerId) return false; // Already own it

    const currentOwner = gameState.players.find(p => p.id === metropolis.owner);
    const ownerLevel = currentOwner?.improvements?.[type] || 0;
    // Can steal only if player has higher improvement level
    return improvementLevel > ownerLevel;

    return true;
}
