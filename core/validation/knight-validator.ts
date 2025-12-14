import { GameState, PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { hasKnightAtVertex, getKnightAtVertex } from '@/core/engine/knights/knight-manager';
import { hasResources } from '@/core/engine/resources/resource-manager';
import { KNIGHT_COST, KNIGHT_ACTIVATION_COST, KNIGHT_UPGRADE_COST, CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { getAdjacentEdgesForVertex, getEdgeEndpoints, getHexesForVertex } from '@/lib/hex';

/**
 * Knight Validator (Cities & Knights Expansion)
 * Validates knight placement, activation, movement, and upgrade operations
 */

/**
 * Validate knight placement
 *
 * Rules:
 * 1. Vertex must have player's own settlement or city
 * 2. Vertex cannot already have a knight
 * 3. Player must have resources (1 sheep + 1 ore)
 *
 * @param gameState - Current game state
 * @param vertexId - Vertex to place knight on
 * @param playerId - Player placing the knight
 * @returns true if valid placement
 */
export function isValidKnightPlacement(
    gameState: GameState,
    vertexId: string,
    playerId: string
): boolean {
    // 1. Check vertex is empty (no building)
    const vertex = gameState.board.vertices[vertexId];
    if (vertex && (vertex.structure || vertex.owner)) return false;

    // 2. Check no existing knight
    if (hasKnightAtVertex(gameState, vertexId)) return false;

    // 3. Check connected to player's road
    const [q, r, d] = vertexId.split(',').map(Number);
    const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);

    const hasRoad = adjacentEdges.some(edgeId => {
        const edge = gameState.board.edges[edgeId];
        return edge && edge.owner === playerId;
    });

    if (!hasRoad) return false;

    return true;
}

/**
 * Check if player can afford to place a knight
 *
 * @param player - Player state
 * @returns true if player has 1 sheep + 1 ore
 */
export function canAffordKnight(player: PlayerState): boolean {
    return hasResources(player, KNIGHT_COST);
}

/**
 * Validate knight activation
 *
 * Rules:
 * 1. Knight must exist and belong to player
 * 2. Knight must not already be active
 * 3. Player must have resources (1 wheat)
 *
 * @param gameState - Current game state
 * @param knightId - Knight to activate
 * @param playerId - Player activating the knight
 * @returns true if valid activation
 */
export function isValidKnightActivation(
    gameState: GameState,
    knightId: string,
    playerId: string
): boolean {
    // Find the knight
    const knight = findKnight(gameState, knightId);
    if (!knight) return false;

    // Check ownership
    if (knight.playerId !== playerId) return false;

    // Check not already active
    if (knight.active) return false;

    return true;
}

/**
 * Check if player can afford to activate a knight
 *
 * @param player - Player state
 * @returns true if player has 1 wheat
 */
export function canAffordKnightActivation(player: PlayerState): boolean {
    return hasResources(player, KNIGHT_ACTIVATION_COST);
}

/**
 * Validate knight movement
 *
 * Rules:
 * 1. Knight must exist and belong to player
 * 2. Knight must be active
 * 3. Target vertex must be adjacent to current vertex
 * 4. Path between vertices must be along player's own road
 *
 * @param gameState - Current game state
 * @param knightId - Knight to move
 * @param targetVertexId - Target vertex
 * @param playerId - Player moving the knight
 * @returns true if valid movement
 */
export function isValidKnightMovement(
    gameState: GameState,
    knightId: string,
    targetVertexId: string,
    playerId: string
): boolean {
    // Find the knight
    const knight = findKnight(gameState, knightId);
    if (!knight) return false;

    // Check ownership
    if (knight.playerId !== playerId) return false;

    // Check knight is active
    if (!knight.active) return false;

    // Check target is adjacent and connected by own road
    if (!canMoveKnightToVertex(gameState, knight, targetVertexId, playerId)) {
        return false;
    }

    // Check target occupation
    const targetVertex = gameState.board.vertices[targetVertexId];

    // Cannot move to vertex with ANY building (own or opponent)
    if (targetVertex && (targetVertex.structure || targetVertex.owner)) {
        return false;
    }

    // Check for knights
    const opponentKnight = getKnightAtVertex(gameState, targetVertexId);
    if (opponentKnight) {
        if (opponentKnight.playerId === playerId) {
            return false; // Cannot move to own knight
        }

        // Check strength for displacement
        const attackerStrength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];
        const defenderStrength = CK_CONSTANTS.KNIGHT_STRENGTH[opponentKnight.level];

        if (attackerStrength <= defenderStrength) {
            return false; // Cannot displace equal or stronger knight
        }
    }

    return true;
}

/**
 * Check if a knight can move to a target vertex
 * Uses BFS to find a path along player's roads
 * Knights can pass through intermediate nodes occupied by friendly units
 *
 * @param gameState - Current game state
 * @param knight - Knight to move
 * @param targetVertexId - Target vertex
 * @param playerId - Player ID
 * @returns true if movement is valid
 */
export function canMoveKnightToVertex(
    gameState: GameState,
    knight: Knight,
    targetVertexId: string,
    playerId: string
): boolean {
    const currentVertexId = knight.vertexId;
    if (currentVertexId === targetVertexId) return false; // Can't move to same vertex

    // BFS to find path along player's roads
    const queue: string[] = [currentVertexId];
    const visited = new Set<string>([currentVertexId]);

    while (queue.length > 0) {
        const vertexId = queue.shift()!;

        // Get adjacent edges for current vertex
        const [q, r, d] = vertexId.split(',').map(Number);
        const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);

        for (const edgeId of adjacentEdges) {
            const edge = gameState.board.edges[edgeId];

            // Must be player's road
            if (!edge || edge.owner !== playerId) continue;

            // Get the other endpoint of this edge
            const endpoints = getEdgeEndpoints(edge.q, edge.r, edge.d);
            const neighborVertexId = endpoints.find(v => v !== vertexId);

            if (!neighborVertexId || visited.has(neighborVertexId)) continue;

            // Check if this neighbor is the target
            if (neighborVertexId === targetVertexId) {
                // Target found - but is it a valid destination?
                // Knights can only move to empty vertices or vertices with enemy knights (displacement)
                const targetVertex = gameState.board.vertices[targetVertexId];

                // Cannot move to vertex with any building
                if (targetVertex && (targetVertex.structure || targetVertex.owner)) {
                    return false;
                }

                // Check for knights at target
                for (const player of gameState.players) {
                    if (!player.knights) continue;
                    const knightAtTarget = player.knights.find(k => k.vertexId === targetVertexId);
                    if (knightAtTarget) {
                        // Cannot move to own knight
                        if (knightAtTarget.playerId === playerId) {
                            return false;
                        }

                        // Check if we can displace this enemy knight
                        // Must have higher strength to displace
                        const attackerStrength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];
                        const defenderStrength = CK_CONSTANTS.KNIGHT_STRENGTH[knightAtTarget.level];

                        if (attackerStrength <= defenderStrength) {
                            // Cannot displace equal or stronger knight
                            return false;
                        }
                        // Can displace this weaker enemy knight
                    }
                }

                // Valid destination found!
                return true;
            }

            // Check if we can pass through this intermediate vertex
            // We can pass through vertices with:
            // 1. No structure (empty)
            // 2. Friendly structures (buildings or knights)
            const vertex = gameState.board.vertices[neighborVertexId];
            const hasEnemyBuilding = vertex && vertex.owner && vertex.owner !== playerId;

            // Check for knights at this vertex
            let hasEnemyKnight = false;
            for (const player of gameState.players) {
                if (!player.knights || player.id === playerId) continue;
                const knightAtVertex = player.knights.find(k => k.vertexId === neighborVertexId);
                if (knightAtVertex) {
                    hasEnemyKnight = true;
                    break;
                }
            }

            // Cannot pass through enemy buildings or enemy knights
            if (hasEnemyBuilding || hasEnemyKnight) continue;

            // Add to queue for further exploration
            visited.add(neighborVertexId);
            queue.push(neighborVertexId);
        }
    }

    return false;
}

/**
 * Validate knight upgrade
 *
 * Rules:
 * 1. Knight must exist and belong to player
 * 2. Knight must not be at maximum level (mighty)
 * 3. Player must have resources (1 sheep + 1 ore)
 *
 * @param gameState - Current game state
 * @param knightId - Knight to upgrade
 * @param playerId - Player upgrading the knight
 * @returns true if valid upgrade
 */
export function isValidKnightUpgrade(
    gameState: GameState,
    knightId: string,
    playerId: string
): boolean {
    // Find the knight
    const knight = findKnight(gameState, knightId);
    if (!knight) return false;

    // Check ownership
    if (knight.playerId !== playerId) return false;

    // Check not at max level
    if (knight.level === 'mighty') return false;

    return true;
}

/**
 * Check if player can afford to upgrade a knight
 *
 * @param player - Player state
 * @returns true if player has 1 sheep + 1 ore
 */
export function canAffordKnightUpgrade(player: PlayerState): boolean {
    return hasResources(player, KNIGHT_UPGRADE_COST);
}

/**
 * Find a knight by ID across all players
 *
 * @param gameState - Current game state
 * @param knightId - Knight ID to find
 * @returns Knight if found, null otherwise
 */
function findKnight(gameState: GameState, knightId: string): Knight | null {
    for (const player of gameState.players) {
        if (!player.knights) continue;
        const knight = player.knights.find(k => k.id === knightId);
        if (knight) return knight;
    }
    return null;
}

/**
 * Get the player who owns a knight
 *
 * @param gameState - Current game state
 * @param knightId - Knight ID
 * @returns Player state if found, null otherwise
 */
export function getKnightOwner(gameState: GameState, knightId: string): PlayerState | null {
    for (const player of gameState.players) {
        if (!player.knights) continue;
        const knight = player.knights.find(k => k.id === knightId);
        if (knight) return player;
    }
    return null;
}

/**
 * Check if a knight is adjacent to the robber
 *
 * @param gameState - Current game state
 * @param knight - Knight to check
 * @returns true if knight is adjacent to robber
 */
export function isKnightAdjacentToRobber(gameState: GameState, knight: Knight): boolean {
    if (!knight.vertexId || knight.vertexId === 'displaced') return false;

    const [q, r, d] = knight.vertexId.split(',').map(Number);
    const adjacentHexes = getHexesForVertex(q, r, d);

    return adjacentHexes.some(h => `${h.q},${h.r}` === gameState.robberHexId);
}

/**
 * Validate chase away robber action
 *
 * Rules:
 * 1. Knight must exist and belong to player
 * 2. Knight must be active
 * 3. Knight must be adjacent to robber
 * 4. Cannot chase robber before first barbarian attack
 *
 * @param gameState - Current game state
 * @param knightId - Knight to use
 * @param playerId - Player chasing the robber
 * @returns true if valid chase action
 */
export function canChaseAwayRobber(
    gameState: GameState,
    knightId: string,
    playerId: string
): boolean {
    // Find the knight
    const knight = findKnight(gameState, knightId);
    if (!knight) return false;

    // Check ownership
    if (knight.playerId !== playerId) return false;

    // Check knight is active
    if (!knight.active) return false;

    // Check adjacent to robber
    if (!isKnightAdjacentToRobber(gameState, knight)) return false;

    // C&K Rule: Cannot chase robber before first barbarian attack
    if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
        return false;
    }

    return true;
}
