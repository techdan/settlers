import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { randomUUID } from 'crypto';
import { removeResources } from '@/core/engine/resources/resource-manager';
import { getCityWallCount } from '@/core/utils/city-wall-utils';

/**
 * City Walls Service (Cities & Knights Expansion)
 * Handles building city walls
 *
 * Cost: 2 brick
 * Requirement: Must be built on a city/metropolis
 * Effect: +2 discard threshold for ROBBER/7 ONLY (not barbarians)
 * Max: 1 per city, 3 total per player
 *
 * Rules:
 * - Robber/7 discard threshold = 7 + (2 × number of walls)
 * - Walls do NOT affect barbarian attacks (no discards, no protection)
 * - Walls are automatically destroyed when city is downgraded to settlement
 * - Walls are stored as vertex.hasCityWall in board state
 */

/**
 * Build a city wall on a specific city
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

    // Check if wall already exists on this city
    if (vertex.hasCityWall) {
        throw new Error('This city already has a wall');
    }

    // Check max walls (3 total per player)
    const currentWallCount = getCityWallCount(gameState, playerId);
    if (currentWallCount >= 3) {
        throw new Error('Maximum 3 city walls allowed per player');
    }

    // Check resources (2 brick)
    if (player.resources.brick < 2) {
        throw new Error('Not enough brick (need 2)');
    }

    // Deduct resources
    removeResources(player, { brick: 2 });

    // Add the wall to this city
    vertex.hasCityWall = true;

    // Log the build
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} built a city wall (${currentWallCount + 1}/3)`,
        playerId
    });

    await updateGameState(gameState);
    return gameState;
}
