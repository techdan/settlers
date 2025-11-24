import { GameState } from './game-types';
import { getAdjacentVertexIds, getEdgeEndpoints, getAdjacentEdgesForVertex } from './hex';

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

export const calculateLongestRoad = (gameState: GameState, playerId: string): number => {
    // 1. Get all edges owned by player
    const playerEdges = Object.values(gameState.board.edges).filter(e => e.owner === playerId);
    if (playerEdges.length === 0) return 0;

    // 2. Build adjacency graph (edgeId -> list of connected edgeIds)
    // Two edges are connected if they share a vertex AND that vertex is NOT blocked by an opponent
    const adj: Record<string, string[]> = {};
    playerEdges.forEach(e => adj[e.id] = []);

    for (const edge of playerEdges) {
        const [q, r, d] = edge.id.split(',').map(Number);
        const endpoints = getEdgeEndpoints(q, r, d);

        for (const vId of endpoints) {
            // Check if vertex is blocked by opponent
            const vertex = gameState.board.vertices[vId];
            if (vertex.owner !== null && vertex.owner !== playerId) {
                continue; // Blocked
            }

            // Find other edges connected to this vertex
            const [vq, vr, vd] = vId.split(',').map(Number);
            const neighborEdgeIds = getAdjacentEdgesForVertex(vq, vr, vd);

            for (const nId of neighborEdgeIds) {
                if (nId !== edge.id && adj[nId]) { // If it's a player edge
                    adj[edge.id].push(nId);
                }
            }
        }
    }

    // 3. DFS to find longest path
    let maxLen = 0;

    const dfs = (currentEdgeId: string, visited: Set<string>, currentLen: number) => {
        maxLen = Math.max(maxLen, currentLen);

        const neighbors = adj[currentEdgeId];
        for (const nId of neighbors) {
            if (!visited.has(nId)) {
                visited.add(nId);
                dfs(nId, visited, currentLen + 1);
                visited.delete(nId);
            }
        }
    };

    // Try starting from each edge (endpoints)
    // Actually, we can just start DFS from each edge.
    // Optimization: Only start from edges that have degree 1 or are part of a cycle?
    // Brute force is fine for < 15 roads.

    for (const edge of playerEdges) {
        dfs(edge.id, new Set([edge.id]), 1);
    }

    return maxLen;
};
