import { GameState } from '@/lib/types';
import { getAdjacentVertexIds, getEdgeEndpoints } from '@/lib/hex';

/**
 * Validate settlement placement during setup phase
 * 
 * Rules:
 * 1. Vertex must exist and be empty
 * 2. Must be at least 2 edges away from any other settlement (distance rule)
 * 
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to place settlement
 * @param playerId - Player attempting to place
 * @returns true if valid placement
 */
export function isValidSetupSettlement(
    gameState: GameState,
    vertexId: string,
    playerId: string
): boolean {
    // 1. Check if vertex exists and is empty
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false; // Invalid vertex ID
    if (vertex.owner !== null) return false; // Already occupied

    // Check for knights (Cities & Knights rule: cannot build on occupied vertex)
    // We need to check all players' knights
    const hasKnight = gameState.players.some(p =>
        p.knights?.some(k => k.vertexId === vertexId)
    );
    if (hasKnight) return false;

    // 2. Distance Rule: Check adjacent vertices
    const [q, r, d] = vertexId.split(',').map(Number);
    const adjacentIds = getAdjacentVertexIds(q, r, d);

    for (const adjId of adjacentIds) {
        const adjVertex = gameState.board.vertices[adjId];
        if (adjVertex && adjVertex.owner !== null) {
            return false; // Too close to another building
        }
    }

    return true;
}

/**
 * Validate road placement during setup phase
 *
 * Rules:
 * 1. Edge must exist and be empty
 * 2. Must be adjacent to the last placed settlement
 *
 * @param gameState - Current game state
 * @param edgeId - Edge ID to place road
 * @param playerId - Player attempting to place
 * @returns true if valid placement
 */
export function isValidSetupRoad(
    gameState: GameState,
    edgeId: string,
    playerId: string
): boolean {
    // 1. Check if edge exists and is empty
    const edge = gameState.board.edges[edgeId];
    if (!edge) return false; // Invalid edge ID
    if (edge.owner !== null) return false; // Already occupied

    // 2. Must be adjacent to last placed settlement
    if (!gameState.lastPlacedSettlementId) return false;

    // Check if edge connects to the settlement
    const [q, r, d] = edgeId.split(',').map(Number);
    const endpoints = getEdgeEndpoints(q, r, d);

    if (!endpoints.includes(gameState.lastPlacedSettlementId)) {
        return false; // Not connected to the just-placed settlement
    }

    return true;
}
