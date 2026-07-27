import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { placeKnight, activateKnight, moveKnight, upgradeKnight, relocateKnight, chaseAwayRobber } from '@/core/engine/knights/knight-manager';
import {
    isValidKnightPlacement,
    isValidKnightActivation,
    isValidKnightMovement,
    isValidKnightUpgrade,
    canAffordKnight,
    canAffordKnightActivation,
    canAffordKnightUpgrade,
    canChaseAwayRobber
} from '@/core/validation/knight-validator';
import { removeResources } from '@/core/engine/resources/resource-manager';
import { KNIGHT_COST, KNIGHT_ACTIVATION_COST, KNIGHT_UPGRADE_COST } from '@/core/rules/commodity-constants';

/**
 * Knight Service (Cities & Knights Expansion)
 * Orchestrates knight-related operations
 *
 * Pattern: validation → state mutation → persistence → real-time sync
 */

/**
 * Build a knight
 * Cost: 1 sheep + 1 ore
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex to place knight on
 * @returns Updated game state
 */
export async function buildKnightAction(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only build knights during main phase');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Validate placement
    if (!isValidKnightPlacement(gameState, vertexId, playerId)) {
        throw new Error('Invalid knight placement');
    }

    // 6. Check affordability
    if (!canAffordKnight(player)) {
        throw new Error('Insufficient resources (need 1 sheep + 1 ore)');
    }

    // 7. Deduct resources
    removeResources(player, KNIGHT_COST);

    // 8. Place knight
    placeKnight(gameState, playerId, vertexId);

    // 9. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Activate a knight
 * Cost: 1 wheat
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param knightId - Knight to activate
 * @returns Updated game state
 */
export async function activateKnightAction(
    roomId: string,
    playerId: string,
    knightId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only activate knights during main phase');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Validate activation
    if (!isValidKnightActivation(gameState, knightId, playerId)) {
        throw new Error('Invalid knight activation');
    }

    // 6. Check affordability
    if (!canAffordKnightActivation(player)) {
        throw new Error('Insufficient resources (need 1 wheat)');
    }

    // 7. Deduct resources
    removeResources(player, KNIGHT_ACTIVATION_COST);

    // 8. Activate knight
    activateKnight(gameState, knightId);

    // 9. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Move a knight
 * Knight must be active; becomes inactive after moving
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param knightId - Knight to move
 * @param targetVertexId - Target vertex
 * @returns Updated game state
 */
export async function moveKnightAction(
    roomId: string,
    playerId: string,
    knightId: string,
    targetVertexId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only move knights during main phase');
    }

    // 4. Validate movement
    if (!isValidKnightMovement(gameState, knightId, targetVertexId, playerId)) {
        throw new Error('Invalid knight movement');
    }

    // 5. Move knight
    moveKnight(gameState, knightId, targetVertexId);

    // 6. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Upgrade a knight
 * Cost: 1 sheep + 1 ore
 * basic → strong → mighty
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param knightId - Knight to upgrade
 * @returns Updated game state
 */
export async function upgradeKnightAction(
    roomId: string,
    playerId: string,
    knightId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only upgrade knights during main phase');
    }

    // 4. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 5. Validate upgrade
    if (!isValidKnightUpgrade(gameState, knightId, playerId)) {
        throw new Error('Invalid knight upgrade');
    }

    // 6. Check affordability
    if (!canAffordKnightUpgrade(player)) {
        throw new Error('Insufficient resources (need 1 sheep + 1 ore)');
    }

    // 7. Deduct resources
    removeResources(player, KNIGHT_UPGRADE_COST);

    // 8. Upgrade knight
    upgradeKnight(gameState, knightId);

    // 9. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Relocate a displaced knight
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param knightId - Knight to relocate
 * @param targetVertexId - Target vertex (or null to remove)
 * @returns Updated game state
 */
export async function relocateKnightAction(
    roomId: string,
    playerId: string,
    knightId: string,
    targetVertexId: string | null
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Relocate knight
    // Validation is handled inside relocateKnight
    relocateKnight(gameState, playerId, knightId, targetVertexId);

    // 4. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Chase away the robber using an active knight
 * Knight must be active and adjacent to the robber
 * Knight becomes inactive after chasing the robber
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param knightId - Knight to use for chasing
 * @returns Updated game state
 */
export async function chaseAwayRobberAction(
    roomId: string,
    playerId: string,
    knightId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Knights are only available in Cities & Knights mode');
    }

    // 3. Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only chase the robber during main phase');
    }

    // 4. Validate chase action
    if (!canChaseAwayRobber(gameState, knightId, playerId)) {
        throw new Error('Cannot chase away robber with this knight');
    }

    // 5. Chase away robber
    chaseAwayRobber(gameState, knightId);

    // 6. Save to database
    await updateGameState(gameState);

    return gameState;
}
