import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { upgradeImprovement, canAffordImprovement } from '@/core/engine/improvements/improvement-manager';
import { buildMetropolis, canBuildMetropolis, checkMetropolisOwnership } from '@/core/engine/metropolis/metropolis-manager';
import { ImprovementType, MetropolisType } from '@/core/rules/commodity-constants';

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

    // 7. Check if metropolis ownership should transfer
    checkMetropolisOwnership(gameState, improvement);

    // 8. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Build/claim a metropolis
 * Requires level 4+ in corresponding improvement
 * Can steal from another player if you have higher level
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex where city is located
 * @param improvement - Improvement type (determines metropolis type)
 * @returns Updated game state
 */
export async function buildPlayerMetropolis(
    roomId: string,
    playerId: string,
    vertexId: string,
    improvement: MetropolisType
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

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only build metropolises during main phase');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Validate metropolis building
    if (!canBuildMetropolis(gameState, playerId, improvement, vertexId)) {
        throw new Error('Cannot build metropolis (check level requirement and city ownership)');
    }

    // 6. Build metropolis
    const success = buildMetropolis(gameState, playerId, vertexId, improvement);
    if (!success) {
        throw new Error('Failed to build metropolis');
    }

    // 7. Save to database
    await updateGameState(gameState);

    return gameState;
}
