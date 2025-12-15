import { GameState, PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { KnightLevel, CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { getCanonicalEdgeId, getAdjacentVertexIds, getAdjacentEdgesForVertex, getEdgeEndpoints, getHexesForVertex } from '@/lib/hex';
import { GamePhase } from '@/lib/types';
import { updateLongestRoad } from '@/core/engine/scoring/longest-road';

/**
 * Knight Manager (Cities & Knights Expansion)
 * Handles knight placement, activation, movement, and strength calculations
 *
 * Key rules:
 * - Knights cost 1 sheep + 1 ore to place
 * - Activation costs 1 wheat
 * - Knights can only be placed on vertices with own settlements/cities
 * - Active knights contribute to barbarian defense
 * - Knights can move along own roads (becomes inactive after moving)
 * - Three levels: basic (strength 1), strong (strength 2), mighty (strength 3)
 */

/**
 * Place a new knight on the board
 *
 * @param gameState - Current game state
 * @param playerId - Player placing the knight
 * @param vertexId - Vertex to place knight on (must have player's settlement/city)
 * @returns Created knight
 */
export function placeKnight(
    gameState: GameState,
    playerId: string,
    vertexId: string
): Knight {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Initialize knights array if needed
    if (!player.knights) {
        player.knights = [];
    }

    // Create new knight
    const knight: Knight = {
        id: `knight-${Date.now()}-${Math.random()}`,
        vertexId,
        playerId,
        level: 'basic',
        active: false, // Knights start inactive
    };

    // Add to player's knights
    player.knights.push(knight);

    // Update longest road (new knight may block opponent roads at T-intersection)
    updateLongestRoad(gameState);

    // Log placement
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} placed a knight`,
        playerId
    });

    return knight;
}

/**
 * Activate a knight (costs 1 wheat)
 * Active knights contribute to barbarian defense and can move
 *
 * @param gameState - Current game state
 * @param knightId - Knight to activate
 * @returns Updated knight
 */
export function activateKnight(gameState: GameState, knightId: string): Knight {
    // Find knight and its owner
    let knight: Knight | undefined;
    let player: PlayerState | undefined;

    for (const p of gameState.players) {
        if (!p.knights) continue;
        const k = p.knights.find(kn => kn.id === knightId);
        if (k) {
            knight = k;
            player = p;
            break;
        }
    }

    if (!knight || !player) throw new Error('Knight not found');
    if (knight.active) throw new Error('Knight is already active');

    // Activate the knight
    knight.active = true;

    // Update cached knight strength
    updateActiveKnightCount(player);

    // Log activation
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} activated a knight`,
        playerId: player.id
    });

    return knight;
}

/**
 * Move a knight to an adjacent vertex along own road
 * Knight becomes inactive after moving
 *
 * @param gameState - Current game state
 * @param knightId - Knight to move
 * @param targetVertexId - Target vertex
 * @returns Updated knight
 */
export function moveKnight(
    gameState: GameState,
    knightId: string,
    targetVertexId: string
): Knight {
    // Find knight and its owner
    let knight: Knight | undefined;
    let player: PlayerState | undefined;

    for (const p of gameState.players) {
        if (!p.knights) continue;
        const k = p.knights.find(kn => kn.id === knightId);
        if (k) {
            knight = k;
            player = p;
            break;
        }
    }

    if (!knight || !player) throw new Error('Knight not found');
    if (!knight.active) throw new Error('Knight must be active to move');

    // Check for opponent knight
    const opponentKnight = getKnightAtVertex(gameState, targetVertexId);
    if (opponentKnight) {
        if (opponentKnight.playerId === player.id) {
            throw new Error('Cannot move to a vertex occupied by your own knight');
        }

        // Check strength
        const attackerStrength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];
        const defenderStrength = CK_CONSTANTS.KNIGHT_STRENGTH[opponentKnight.level];

        if (attackerStrength <= defenderStrength) {
            throw new Error('Cannot displace a knight of equal or greater strength');
        }

        // Displace (main_phase will be preserved after displacement)
        displaceKnight(gameState, opponentKnight, 'main_phase');
    }

    // Move the knight
    knight.vertexId = targetVertexId;

    // Knight becomes inactive after moving
    knight.active = false;

    // Update cached knight strength
    updateActiveKnightCount(player);

    // Update longest road (knight may now block opponent roads at T-intersection)
    updateLongestRoad(gameState);

    // Log movement
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} moved a knight`,
        playerId: player.id
    });

    return knight;
}

/**
 * Upgrade a knight to the next level
 * basic → strong → mighty
 * Costs 1 sheep + 1 ore per upgrade
 *
 * @param gameState - Current game state
 * @param knightId - Knight to upgrade
 * @returns Updated knight
 */
export function upgradeKnight(gameState: GameState, knightId: string): Knight {
    // Find knight and its owner
    let knight: Knight | undefined;
    let player: PlayerState | undefined;

    for (const p of gameState.players) {
        if (!p.knights) continue;
        const k = p.knights.find(kn => kn.id === knightId);
        if (k) {
            knight = k;
            player = p;
            break;
        }
    }

    if (!knight || !player) throw new Error('Knight not found');

    // Determine next level
    let newLevel: KnightLevel;
    if (knight.level === 'basic') {
        newLevel = 'strong';
    } else if (knight.level === 'strong') {
        // Fortress ability: Must have Politics level 3 to upgrade to Mighty
        const politicsLevel = player.improvements?.politics || 0;
        if (politicsLevel < 3) {
            throw new Error('Must have Politics level 3 (Fortress) to upgrade to Mighty Knight');
        }
        newLevel = 'mighty';
    } else {
        throw new Error('Knight is already at maximum level');
    }

    // Check if player has available pieces of the target level
    const currentCountAtTargetLevel = countKnightsByLevel(player, newLevel);
    const maxPiecesAtTargetLevel = CK_CONSTANTS.KNIGHT_PIECE_LIMITS[newLevel];

    if (currentCountAtTargetLevel >= maxPiecesAtTargetLevel) {
        throw new Error(`You already have ${maxPiecesAtTargetLevel} ${newLevel} knights. Cannot upgrade.`);
    }

    // Upgrade the knight
    knight.level = newLevel;

    // Update cached knight strength if active
    if (knight.active) {
        updateActiveKnightCount(player);
    }

    // Log upgrade
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} upgraded a knight to ${newLevel}`,
        playerId: player.id
    });

    return knight;
}

/**
 * Calculate total knight strength for a player
 * Only active knights contribute to strength
 * basic = 1, strong = 2, mighty = 3
 *
 * @param player - Player state
 * @returns Total active knight strength
 */
export function calculateKnightStrength(player: PlayerState): number {
    if (!player.knights) return 0;

    return player.knights.reduce((total, knight) => {
        if (!knight.active) return total;

        const strength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];
        return total + strength;
    }, 0);
}

/**
 * Update cached active knight count for a player
 * Called after activating, deactivating, or moving knights
 *
 * @param player - Player state
 */
export function updateActiveKnightCount(player: PlayerState): void {
    player.activeKnightCount = calculateKnightStrength(player);
}

/**
 * Get all active knights for a player
 *
 * @param player - Player state
 * @returns Array of active knights
 */
export function getActiveKnights(player: PlayerState): Knight[] {
    if (!player.knights) return [];
    return player.knights.filter(k => k.active);
}

/**
 * Get all inactive knights for a player
 *
 * @param player - Player state
 * @returns Array of inactive knights
 */
export function getInactiveKnights(player: PlayerState): Knight[] {
    if (!player.knights) return [];
    return player.knights.filter(k => !k.active);
}

/**
 * Count knights by level for a player
 *
 * @param player - Player state
 * @param level - Knight level to count
 * @returns Number of knights at the specified level
 */
export function countKnightsByLevel(player: PlayerState, level: KnightLevel): number {
    if (!player.knights) return 0;
    return player.knights.filter(k => k.level === level).length;
}

/**
 * Find knight at a specific vertex
 *
 * @param gameState - Current game state
 * @param vertexId - Vertex to check
 * @returns Knight at vertex, or null if none
 */
export function getKnightAtVertex(gameState: GameState, vertexId: string): Knight | null {
    for (const player of gameState.players) {
        if (!player.knights) continue;
        const knight = player.knights.find(k => k.vertexId === vertexId);
        if (knight) return knight;
    }
    return null;
}

/**
 * Check if a vertex has a knight
 *
 * @param gameState - Current game state
 * @param vertexId - Vertex to check
 * @returns true if vertex has a knight
 */
export function hasKnightAtVertex(gameState: GameState, vertexId: string): boolean {
    return getKnightAtVertex(gameState, vertexId) !== null;
}

/**
 * Get adjacent vertices connected by an edge
 * Returns vertices that share an edge with the given vertex
 *
 * @param vertexId - Current vertex ID (format: "q,r,d")
 * @returns Array of adjacent vertex IDs
 */
export function getAdjacentVertices(vertexId: string): string[] {
    const [q, r, d] = vertexId.split(',').map(Number);
    return getAdjacentVertexIds(q, r, d);
}

/**
 * Remove a knight from the game (used when a city is destroyed by barbarians)
 *
 * @param gameState - Current game state
 * @param knightId - Knight to remove
 */
export function removeKnight(gameState: GameState, knightId: string): void {
    for (const player of gameState.players) {
        if (!player.knights) continue;
        const index = player.knights.findIndex(k => k.id === knightId);
        if (index !== -1) {
            player.knights.splice(index, 1);
            updateActiveKnightCount(player);
            // Update longest road (removed knight may unblock opponent roads)
            updateLongestRoad(gameState);
            return;
        }
    }
}

/**
 * Displace an opponent's knight
 * The displaced knight must move to an adjacent empty vertex connected by their own road
 * If no such vertex exists, the knight is removed
 */
/**
 * Displace an opponent's knight
 * Sets the game into 'knight_displacement' phase
 * The displaced knight owner must relocate it
 */
export function displaceKnight(gameState: GameState, knight: Knight, nextPhase: GamePhase) {
    const owner = gameState.players.find(p => p.id === knight.playerId);
    if (!owner) return;

    const currentVertexId = knight.vertexId;

    // Mark knight as displaced (remove from board temporarily)
    knight.vertexId = 'displaced';

    // Set displacement state
    gameState.pendingDisplacement = {
        knightId: knight.id,
        playerId: owner.id,
        originVertexId: currentVertexId,
        previousPhase: nextPhase
    };

    gameState.phase = 'knight_displacement';

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${owner.name}'s knight was displaced and must be relocated`,
        playerId: owner.id
    });
}

/**
 * Get all valid relocation targets for a displaced knight
 * Must be empty intersections connected by the player's own roads from the origin
 *
 * @param gameState - Current game state
 * @param playerId - Player ID
 * @param originVertexId - Where the knight was displaced from
 * @returns Array of valid vertex IDs
 */
export function getValidRelocationTargets(
    gameState: GameState,
    playerId: string,
    originVertexId: string
): string[] {
    const validTargets = new Set<string>();
    const visited = new Set<string>();
    const queue = [originVertexId];
    visited.add(originVertexId);

    while (queue.length > 0) {
        const currentVertexId = queue.shift()!;
        const [q, r, d] = currentVertexId.split(',').map(Number);

        // Get all connected edges owned by player
        const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);

        for (const edgeId of adjacentEdges) {
            const edge = gameState.board.edges[edgeId];
            // Must be owned by player (road)
            if (!edge || edge.owner !== playerId) continue;

            // Get the other endpoint of this edge
            const endpoints = getEdgeEndpoints(edge.q, edge.r, edge.d);
            const neighborId = endpoints.find(id => id !== currentVertexId);

            if (neighborId && !visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);

                // Check if this vertex is a valid destination
                // 1. Must not be the origin (which is occupied by attacker anyway)
                // 2. Must not have a building
                // 3. Must not have a knight
                const vertex = gameState.board.vertices[neighborId];
                const hasBuilding = vertex && (vertex.structure || vertex.owner);
                const hasKnight = hasKnightAtVertex(gameState, neighborId);

                if (!hasBuilding && !hasKnight) {
                    validTargets.add(neighborId);
                }
            }
        }
    }

    return Array.from(validTargets);
}

/**
 * Relocate a displaced knight
 *
 * @param gameState - Current game state
 * @param playerId - Player ID
 * @param knightId - Knight ID
 * @param targetVertexId - Target vertex ID (or null to remove knight)
 */
export function relocateKnight(
    gameState: GameState,
    playerId: string,
    knightId: string,
    targetVertexId: string | null
): void {
    if (gameState.phase !== 'knight_displacement') throw new Error('Not in displacement phase');
    if (gameState.pendingDisplacement?.playerId !== playerId) throw new Error('Not your knight to relocate');
    if (gameState.pendingDisplacement?.knightId !== knightId) throw new Error('Wrong knight');

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    const knight = player.knights?.find(k => k.id === knightId);
    if (!knight) throw new Error('Knight not found');

    if (targetVertexId) {
        // Validate relocation
        const originVertexId = gameState.pendingDisplacement.originVertexId;
        const validTargets = getValidRelocationTargets(gameState, playerId, originVertexId);

        if (!validTargets.includes(targetVertexId)) {
            throw new Error('Invalid relocation target. Must be an empty intersection connected by your roads.');
        }

        // Move knight
        knight.vertexId = targetVertexId;

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} relocated their displaced knight`,
            playerId
        });
    } else {
        // Remove knight
        removeKnight(gameState, knightId);

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} removed their displaced knight`,
            playerId
        });
    }

    // Update longest road (knight relocation may affect road blocking)
    updateLongestRoad(gameState);

    // Restore phase
    gameState.phase = gameState.pendingDisplacement.previousPhase;
    gameState.pendingDisplacement = undefined;
}

/**
 * Chase away the robber using an active knight
 * Knight must be active and adjacent to the robber
 * Knight becomes inactive after chasing the robber
 * Player enters robber placement phase
 *
 * @param gameState - Current game state
 * @param knightId - Knight to use for chasing
 * @returns Updated knight
 */
export function chaseAwayRobber(gameState: GameState, knightId: string): Knight {
    // Find knight and its owner
    let knight: Knight | undefined;
    let player: PlayerState | undefined;

    for (const p of gameState.players) {
        if (!p.knights) continue;
        const k = p.knights.find(kn => kn.id === knightId);
        if (k) {
            knight = k;
            player = p;
            break;
        }
    }

    if (!knight || !player) throw new Error('Knight not found');
    if (!knight.active) throw new Error('Knight must be active to chase the robber');

    // Verify knight is adjacent to robber
    const [q, r, d] = knight.vertexId.split(',').map(Number);
    const adjacentHexes = getHexesForVertex(q, r, d);
    const isAdjacentToRobber = adjacentHexes.some(h => `${h.q},${h.r}` === gameState.robberHexId);

    if (!isAdjacentToRobber) {
        throw new Error('Knight is not adjacent to the robber');
    }

    // C&K Rule: Cannot chase robber before first barbarian attack
    if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
        throw new Error('Cannot chase the robber before the first barbarian attack');
    }

    // Knight becomes inactive
    knight.active = false;

    // Update cached knight strength
    updateActiveKnightCount(player);

    // Set phase to robber placement
    gameState.phase = 'robber_placement';

    // Log action
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name}'s knight chased the robber!`,
        playerId: player.id
    });

    return knight;
}
