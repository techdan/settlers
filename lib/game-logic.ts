import { GameState } from './game-types';
import { getAdjacentVertexIds, getEdgeEndpoints } from './hex';

export const isValidSetupSettlement = (gameState: GameState, vertexId: string, playerId: string): boolean => {
    // 1. Check if vertex exists and is empty
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false; // Invalid vertex ID
    if (vertex.owner !== null) return false; // Already occupied

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
};

export const isValidSetupRoad = (gameState: GameState, edgeId: string, playerId: string): boolean => {
    // 1. Check if edge exists and is empty
    const edge = gameState.board.edges[edgeId];
    if (!edge) return false;
    if (edge.owner !== null) return false;

    // 2. Must connect to the last placed settlement
    if (!gameState.lastPlacedSettlementId) return false; // Should not happen if flow is correct

    const [q, r, d] = edgeId.split(',').map(Number);
    const endpoints = getEdgeEndpoints(q, r, d);

    if (!endpoints.includes(gameState.lastPlacedSettlementId)) {
        return false; // Not connected to the just-placed settlement
    }

    return true;
};
