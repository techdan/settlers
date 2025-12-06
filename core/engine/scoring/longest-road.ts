import { GameState } from '@/lib/types';
import { getEdgeEndpoints } from '@/lib/hex';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';

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

    // 2. Build adjacency graph (Vertex -> Connected Edges)
    // Map<VertexId, Array<{ edgeId: string, neighborVertexId: string }>>
    const adj: Record<string, Array<{ edgeId: string, neighborVertexId: string }>> = {};
    const candidateNodes = new Set<string>();

    for (const edge of playerEdges) {
        const [q, r, d] = edge.id.split(',').map(Number);
        const [v1, v2] = getEdgeEndpoints(q, r, d);

        if (!adj[v1]) adj[v1] = [];
        if (!adj[v2]) adj[v2] = [];

        adj[v1].push({ edgeId: edge.id, neighborVertexId: v2 });
        adj[v2].push({ edgeId: edge.id, neighborVertexId: v1 });

        candidateNodes.add(v1);
        candidateNodes.add(v2);
    }

    // 3. DFS Function
    // Returns the max length of a path starting from currentVertex
    const dfs = (currentVertexId: string, visitedEdgeIds: Set<string>): number => {
        let maxLength = 0;
        const neighbors = adj[currentVertexId] || [];

        for (const { edgeId, neighborVertexId } of neighbors) {
            if (!visitedEdgeIds.has(edgeId)) {
                // Check if neighbor is blocked by opponent building
                const neighborVertex = gameState.board.vertices[neighborVertexId];
                const isBlockedByBuilding = neighborVertex && neighborVertex.owner && neighborVertex.owner !== playerId;

                // Check if neighbor is blocked by opponent knight (Cities & Knights)
                let isBlockedByKnight = false;
                if (gameState.gameMode === 'cities_and_knights') {
                    for (const player of gameState.players) {
                        if (!player.knights || player.id === playerId) continue;
                        const knightAtVertex = player.knights.find(k => k.vertexId === neighborVertexId);
                        if (knightAtVertex) {
                            isBlockedByKnight = true;
                            break;
                        }
                    }
                }

                const isBlocked = isBlockedByBuilding || isBlockedByKnight;

                if (!isBlocked) {
                    visitedEdgeIds.add(edgeId);
                    maxLength = Math.max(maxLength, 1 + dfs(neighborVertexId, visitedEdgeIds));
                    visitedEdgeIds.delete(edgeId);
                }
            }
        }
        return maxLength;
    };

    // 4. Run DFS from each candidate node
    let globalMax = 0;
    for (const startNode of candidateNodes) {
        globalMax = Math.max(globalMax, dfs(startNode, new Set()));
    }

    return globalMax;
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
        name: p.name,
        length: calculateLongestRoad(gameState, p.id)
    }));

    // Sort by length descending
    roadLengths.sort((a, b) => b.length - a.length);

    const longest = roadLengths[0];
    const previousOwner = gameState.longestRoadOwner;
    const previousLength = gameState.longestRoadLength;

    // Must be at least 5 roads to claim
    if (longest.length < 5) {
        gameState.longestRoadOwner = null;
        gameState.longestRoadLength = 0;

        // Log if ownership changed
        if (previousOwner) {
            const prevOwnerName = gameState.players.find(p => p.id === previousOwner)?.name;
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${prevOwnerName} lost Longest Road (roads reduced to ${longest.length})`
            });
        }

        // Update all players' victory points to reflect longest road loss
        updateAllVictoryPoints(gameState);
        return;
    }

    // Check for tie
    if (roadLengths.length > 1 && roadLengths[1].length === longest.length) {
        // Tie - current owner keeps it (or null if no current owner)
        if (gameState.longestRoadOwner &&
            roadLengths.find(r => r.playerId === gameState.longestRoadOwner)?.length === longest.length) {
            // Current owner is tied, they keep it
            gameState.longestRoadLength = longest.length;
            return;
        }
        // Tie but current owner not in tie - no one gets it
        gameState.longestRoadOwner = null;
        gameState.longestRoadLength = 0;
        if (previousOwner) {
            const prevOwnerName = gameState.players.find(p => p.id === previousOwner)?.name;
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${prevOwnerName} lost Longest Road (tied at ${longest.length})`
            });
        }

        // Update all players' victory points to reflect longest road loss
        updateAllVictoryPoints(gameState);
        return;
    }

    // Award to longest (or take away if no longer qualifies)
    gameState.longestRoadOwner = longest.playerId;
    gameState.longestRoadLength = longest.length;

    // Log if ownership changed
    if (previousOwner !== longest.playerId) {
        if (previousOwner) {
            const prevOwnerName = gameState.players.find(p => p.id === previousOwner)?.name;
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${prevOwnerName} lost Longest Road (${longest.name} now has ${longest.length} roads)`
            });
        }
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${longest.name} gained Longest Road with ${longest.length} roads`
        });
    }

    // Update all players' victory points to reflect longest road changes
    updateAllVictoryPoints(gameState);
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
