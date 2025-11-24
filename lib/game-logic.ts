/**
 * @deprecated This file is being refactored.
 * Import validators from '@/core/validation' instead.
 * Import algorithms from '@/core/engine/scoring' instead.
 * This file remains for backward compatibility during migration.
 */

import { GameState } from './game-types';
import { getAdjacentVertexIds, getEdgeEndpoints, getAdjacentEdgesForVertex } from './hex';

// Re-export from new location
export { calculateLongestRoad } from '@/core/engine/scoring/longest-road';

// Keep validators here temporarily
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

export const isValidMainPhaseRoad = (gameState: GameState, edgeId: string, playerId: string): boolean => {
    // 1. Check if edge exists and is empty
    const edge = gameState.board.edges[edgeId];
    if (!edge) return false;
    if (edge.owner !== null) return false;

    // 2. Must connect to own road or own building
    const [q, r, d] = edgeId.split(',').map(Number);
    const endpoints = getEdgeEndpoints(q, r, d);

    let isConnected = false;

    for (const vertexId of endpoints) {
        const vertex = gameState.board.vertices[vertexId];

        // Check for own building
        if (vertex.owner === playerId) {
            isConnected = true;
            break;
        }

        // Check for own connected road (AND no opponent building blocking)
        // If vertex has opponent building, we cannot connect through it.
        if (vertex.owner !== null && vertex.owner !== playerId) {
            continue; // Blocked by opponent
        }

        // Check adjacent edges for own road
        const [vq, vr, vd] = vertexId.split(',').map(Number);
        const adjEdges = getAdjacentEdgesForVertex(vq, vr, vd);

        for (const adjEdgeId of adjEdges) {
            if (adjEdgeId === edgeId) continue;
            const adjEdge = gameState.board.edges[adjEdgeId];
            if (adjEdge && adjEdge.owner === playerId) {
                isConnected = true;
                break;
            }
        }
        if (isConnected) break;
    }

    return isConnected;
};

export const isValidMainPhaseSettlement = (gameState: GameState, vertexId: string, playerId: string): boolean => {
    // 1. Basic checks (empty, distance rule)
    if (!isValidSetupSettlement(gameState, vertexId, playerId)) return false;

    // 2. Must connect to own road
    const [q, r, d] = vertexId.split(',').map(Number);
    const adjEdges = getAdjacentEdgesForVertex(q, r, d);

    let hasRoad = false;
    for (const edgeId of adjEdges) {
        const edge = gameState.board.edges[edgeId];
        if (edge && edge.owner === playerId) {
            hasRoad = true;
            break;
        }
    }

    return hasRoad;
};

export const isValidMainPhaseCity = (gameState: GameState, vertexId: string, playerId: string): boolean => {
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;

    // Must be own settlement
    return vertex.owner === playerId && vertex.structure === 'settlement';
};
