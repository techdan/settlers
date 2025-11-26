import { GameState } from '@/lib/types';
import { getEdgeEndpoints, getAdjacentEdgesForVertex } from '@/lib/hex';
import { isValidSetupSettlement } from './setup-validator';

/**
 * Validate road placement during main game phase
 * 
 * Rules:
 * 1. Edge must exist and be empty
 * 2. Must connect to own road OR own building
 * 3. Cannot connect through opponent's building
 * 
 * @param gameState - Current game state
 * @param edgeId - Edge ID to place road
 * @param playerId - Player attempting to place
 * @returns true if valid placement
 */
export function isValidMainPhaseRoad(
    gameState: GameState,
    edgeId: string,
    playerId: string
): boolean {
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
}

/**
 * Validate settlement placement during main game phase
 * 
 * Rules:
 * 1. Must pass setup settlement validation (empty, distance rule)
 * 2. Must connect to own road
 * 
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to place settlement
 * @param playerId - Player attempting to place
 * @returns true if valid placement
 */
export function isValidMainPhaseSettlement(
    gameState: GameState,
    vertexId: string,
    playerId: string
): boolean {
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
}

/**
 * Validate city upgrade during main game phase
 * 
 * Rules:
 * 1. Vertex must exist
 * 2. Must be player's own settlement
 * 
 * @param gameState - Current game state
 * @param vertexId - Vertex ID to upgrade
 * @param playerId - Player attempting to upgrade
 * @returns true if valid upgrade
 */
export function isValidMainPhaseCity(
    gameState: GameState,
    vertexId: string,
    playerId: string
): boolean {
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) return false;

    // Must be own settlement
    return vertex.owner === playerId && vertex.structure === 'settlement';
}
