import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { randomUUID } from 'crypto';
import { removeResources } from '@/core/engine/resources/resource-manager';

/**
 * City Walls Service (Cities & Knights Expansion)
 * Handles building and managing city walls
 *
 * Cost: 2 brick
 * Requirement: Must be on a city (not settlement)
 * Effect: +2 discard threshold for ROBBER/7 ONLY (not barbarians)
 * Max: 1 per city, 3 total per player
 *
 * Rules:
 * - Robber/7 discard threshold = 7 + (2 × number of walls)
 * - Walls do NOT affect barbarian attacks (no discards, no protection)
 * - Walls destroyed when city is downgraded by barbarian attack
 */

/**
 * Build a city wall at a city location
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID where city is located
 * @returns Updated game state
 */
export async function buildCityWall(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only build during main phase');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate that a city exists at this vertex
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) throw new Error('Invalid vertex');

    if (vertex.owner !== playerId) {
        throw new Error('You do not own this vertex');
    }

    if (vertex.structure !== 'city' && vertex.structure !== 'metropolis') {
        throw new Error('You can only build walls on cities or metropolises');
    }

    // Initialize cityWalls if needed
    if (!player.cityWalls) {
        player.cityWalls = [];
    }

    // Check if wall already exists
    if (player.cityWalls.includes(vertexId)) {
        throw new Error('This city already has a wall');
    }

    // Check max walls (3 total per player)
    if (player.cityWalls.length >= 3) {
        throw new Error('Maximum 3 city walls allowed');
    }

    // Check resources (2 brick)
    if (player.resources.brick < 2) {
        throw new Error('Not enough brick (need 2)');
    }

    // Deduct resources
    removeResources(player, { brick: 2 });

    // Add the wall
    player.cityWalls.push(vertexId);

    // Log the build
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} built a city wall`,
        playerId
    });

    await updateGameState(gameState);
    return gameState;
}

/**
 * Check if a city has a wall
 *
 * @param gameState - Game state
 * @param playerId - Player ID
 * @param vertexId - Vertex ID
 * @returns True if city has a wall
 */
export function hasCityWall(
    gameState: GameState,
    playerId: string,
    vertexId: string
): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.cityWalls) return false;
    return player.cityWalls.includes(vertexId);
}

/**
 * Get robber discard threshold for a player with city walls
 * Base threshold is 7, each wall adds +2
 * This ONLY applies to rolling a 7, NOT barbarian attacks
 *
 * @param player - Player state
 * @returns Card threshold above which player must discard on a 7
 */
export function getRobberDiscardThreshold(player: any): number {
    const baseThreshold = 7;
    const wallCount = player.cityWalls ? player.cityWalls.length : 0;
    return baseThreshold + (wallCount * 2);
}
