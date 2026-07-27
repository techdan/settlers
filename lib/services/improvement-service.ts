import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { upgradeImprovement, canAffordImprovement } from '@/core/engine/improvements/improvement-manager';
import { ImprovementType, MetropolisType } from '@/core/rules/commodity-constants';
import { buildMetropolis, canBuildMetropolis } from '@/core/engine/metropolis/metropolis-manager';

/**
 * Improvement Service (Cities & Knights Expansion)
 * Orchestrates city improvement and metropolis operations
 *
 * Pattern: validation → state mutation → persistence → real-time sync
 */

/**
 * Upgrade a city improvement
 * Costs vary by level: 1, 1, 2, 3, 4 commodities for levels 0→1, 1→2, 2→3, 3→4, 4→5
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param improvement - Improvement type (science/trade/politics)
 * @returns Updated game state
 */
export async function upgradePlayerImprovement(
    roomId: string,
    playerId: string,
    improvement: ImprovementType
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Improvements are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only upgrade improvements during main phase');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Check affordability
    if (!canAffordImprovement(player, improvement)) {
        throw new Error('Insufficient commodities or already at max level');
    }

    // 6. Upgrade improvement
    const newLevel = upgradeImprovement(player, improvement);
    if (newLevel === -1) {
        throw new Error('Failed to upgrade improvement');
    }

    // 7. Log the upgrade
    const improvementName = improvement.charAt(0).toUpperCase() + improvement.slice(1);
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} reached level ${newLevel} in ${improvementName}.`,
        playerId
    });

    // 8. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Select a city to upgrade to a metropolis
 * Called after a player reaches level 4 or 5
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID of the city to upgrade
 * @param improvementType - Type of metropolis (science/trade/politics)
 * @returns Updated game state
 */
export async function selectMetropolisCity(
    roomId: string,
    playerId: string,
    vertexId: string,
    improvementType: ImprovementType
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Metropolises are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Validate improvement level (must be 4 or 5)
    const level = player.improvements?.[improvementType] || 0;
    if (level < 4) {
        throw new Error(`Must be at level 4 or 5 in ${improvementType} to build a metropolis`);
    }

    // 6. Validate vertex is player's city
    const vertex = gameState.board.vertices[vertexId];
    if (!vertex) throw new Error('Invalid vertex');
    if (vertex.owner !== playerId) throw new Error('Not your city');
    if (vertex.structure !== 'city') throw new Error('Must be a city');

    // 7. Validate can build metropolis
    const metropolisType = improvementType as MetropolisType;
    if (!canBuildMetropolis(gameState, playerId, metropolisType, vertexId)) {
        throw new Error('Cannot build metropolis at this location');
    }

    // 8. Build metropolis
    const success = buildMetropolis(gameState, playerId, vertexId, metropolisType);
    if (!success) {
        throw new Error('Failed to build metropolis');
    }

    // 9. Save to database
    await updateGameState(gameState);

    return gameState;
}
