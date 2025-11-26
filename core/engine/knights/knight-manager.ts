import { GameState, PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { KnightLevel, CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { getCanonicalEdgeId } from '@/lib/hex';

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

    // Move the knight
    knight.vertexId = targetVertexId;

    // Knight becomes inactive after moving
    knight.active = false;

    // Update cached knight strength
    updateActiveKnightCount(player);

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
        newLevel = 'mighty';
    } else {
        throw new Error('Knight is already at maximum level');
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

    // Each vertex has 3 adjacent vertices via edges
    const adjacent: string[] = [];

    // The adjacency pattern depends on which corner (d) we're at
    // Each vertex connects to 3 other vertices via the 3 edges emanating from it

    // Edges from this vertex
    const edge1 = getCanonicalEdgeId(q, r, d); // CW edge
    const edge2 = getCanonicalEdgeId(q, r, (d + 5) % 6); // CCW edge

    // For now, return a simplified adjacency list
    // This needs to be implemented based on hex geometry
    // The actual implementation should find vertices connected via these edges

    // TODO: Implement proper hex vertex adjacency calculation
    // For now, return empty array - this will be validated by knight-validator
    return adjacent;
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
            return;
        }
    }
}
