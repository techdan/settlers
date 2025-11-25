import { GameState } from '@/lib/types';
import { getEdgeEndpoints, getAdjacentEdgesForVertex } from '@/lib/hex';

/**
 * Calculate the longest continuous road for a player
 * 
 * Algorithm:
 * 1. Build a graph of player's edges
 * 2. Edges are connected if they share a vertex (not blocked by opponent)
 * 3. Use DFS to find the longest path
 * 
 * @param gameState - Current game state
 * @param playerId - Player to calculate for
 * @returns Length of longest road
 */
export function calculateLongestRoad(gameState: GameState, playerId: string): number {
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

    // Try starting from each edge
    // Brute force is fine for < 15 roads
    for (const edge of playerEdges) {
        dfs(edge.id, new Set([edge.id]), 1);
    }

    return maxLen;
}

/**
 * Update longest road ownership (LEGACY - calculates for all players)
 *
 * @param gameState - Current game state
 * @returns Updated game state (mutated)
 * @deprecated Use updateLongestRoadIncremental for better performance
 */
export function updateLongestRoad(gameState: GameState): void {
    const roadLengths = gameState.players.map(p => ({
        playerId: p.id,
        length: calculateLongestRoad(gameState, p.id)
    }));

    // Sort by length descending
    roadLengths.sort((a, b) => b.length - a.length);

    const longest = roadLengths[0];

    // Must be at least 5 roads to claim
    if (longest.length < 5) {
        gameState.longestRoadOwner = null;
        gameState.longestRoadLength = 0;
        return;
    }

    // Check for tie
    if (roadLengths.length > 1 && roadLengths[1].length === longest.length) {
        // Tie - current owner keeps it (or null if no current owner)
        if (gameState.longestRoadOwner &&
            roadLengths.find(r => r.playerId === gameState.longestRoadOwner)?.length === longest.length) {
            // Current owner is tied, they keep it
            return;
        }
    }

    // Award to longest (or take away if no longer qualifies)
    gameState.longestRoadOwner = longest.playerId;
    gameState.longestRoadLength = longest.length;
}

/**
 * Update longest road ownership incrementally (OPTIMIZED)
 * Only recalculates for the affected player, then checks if global state changed
 *
 * @param gameState - Current game state
 * @param affectedPlayerId - Player who just built a road/settlement
 * @returns Updated game state (mutated)
 */
export function updateLongestRoadIncremental(gameState: GameState, affectedPlayerId: string): void {
    // Calculate road length only for affected player
    const affectedLength = calculateLongestRoad(gameState, affectedPlayerId);

    // Quick exit if affected player can't possibly win longest road
    if (affectedLength < 5 && gameState.longestRoadLength < 5) {
        // No one has 5+ roads, no update needed
        return;
    }

    // If affected player's road is shorter than current longest, no change possible
    if (affectedLength < gameState.longestRoadLength && gameState.longestRoadOwner !== affectedPlayerId) {
        // Current longest owner is someone else with a longer road, no change
        return;
    }

    // Potential change detected - need to check all players
    // This only happens when:
    // 1. Affected player has 5+ roads (potential new leader)
    // 2. Affected player equals/exceeds current longest (potential tie or takeover)
    // 3. Current owner's road was blocked by affected player's settlement
    updateLongestRoad(gameState);
}
