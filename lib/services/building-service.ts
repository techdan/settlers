import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import {
    isValidMainPhaseRoad,
    isValidMainPhaseSettlement,
    isValidMainPhaseCity
} from '@/core/validation/building-validator';
import { BUILDING_COSTS, canAfford, deductCost } from '@/core/rules/building-costs';
import { updateLongestRoad } from '@/core/engine/scoring/longest-road';
import { checkVictoryCondition } from '@/core/rules/victory-conditions';
import { GAME_CONSTANTS } from '@/core/rules/constants';

/**
 * Building Service
 * Orchestrates building placement operations
 */

/**
 * Build a road during main phase
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param edgeId - Edge ID to place road
 * @returns Updated game state
 */
export async function buildRoad(
    roomId: string,
    playerId: string,
    edgeId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.road)) {
        throw new Error('Insufficient resources');
    }

    // Check roads remaining
    if (player.roadsRemaining <= 0) {
        throw new Error('No roads remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.road);

    // Place road
    player.roadsRemaining--;
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';

    // Update longest road
    updateLongestRoad(gameState);

    // Check victory
    const winnerId = checkVictoryCondition(gameState);
    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';
    }

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} built a road`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Build a settlement during main phase
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID to place settlement
 * @returns Updated game state
 */
export async function buildSettlement(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
        throw new Error('Invalid settlement placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.settlement)) {
        throw new Error('Insufficient resources');
    }

    // Check settlements remaining
    if (player.settlementsRemaining <= 0) {
        throw new Error('No settlements remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.settlement);

    // Place settlement
    player.settlementsRemaining--;
    player.victoryPoints += GAME_CONSTANTS.VP_FROM_SETTLEMENT;
    gameState.board.vertices[vertexId].owner = playerId;
    gameState.board.vertices[vertexId].structure = 'settlement';

    // Check victory
    const winnerId = checkVictoryCondition(gameState);
    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';
    }

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} built a settlement`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Upgrade a settlement to a city
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID to upgrade
 * @returns Updated game state
 */
export async function buildCity(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseCity(gameState, vertexId, playerId)) {
        throw new Error('Invalid city upgrade');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.city)) {
        throw new Error('Insufficient resources');
    }

    // Check cities remaining
    if (player.citiesRemaining <= 0) {
        throw new Error('No cities remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.city);

    // Upgrade to city
    player.citiesRemaining--;
    player.settlementsRemaining++; // Return settlement to pool
    player.victoryPoints += 1; // City worth 2, settlement was 1, so +1
    gameState.board.vertices[vertexId].structure = 'city';

    // Check victory
    const winnerId = checkVictoryCondition(gameState);
    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';
    }

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} upgraded to a city`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
