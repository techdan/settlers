import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { resolveBarbbarianAttack } from '@/core/engine/barbarian/barbarian-manager';
import { drawProgressCard } from '@/core/engine/progress/progress-card-manager';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';

/**
 * C&K Game Service
 * Handles Cities & Knights specific game operations
 *
 * Pattern: validation → state mutation → persistence → real-time sync
 */

/**
 * Resolve barbarian attack
 * Called when barbarian reaches position 7
 * Compares knight strength vs city count
 *
 * @param roomId - Room ID
 * @returns Updated game state
 */
export async function resolveBarbarianAttackAction(roomId: string): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Barbarian attacks only occur in Cities & Knights mode');
    }

    // 3. Validate phase
    if (gameState.phase !== 'barbarian_attack') {
        throw new Error('Not in barbarian attack phase');
    }

    // 4. Resolve attack
    resolveBarbbarianAttack(gameState);

    // 5. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Draw a progress card for a player
 * Used when:
 * - Event die triggers card draw (improvement level ≥3)
 * - Defender of Catan wins barbarian attack
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param category - Card category (science/trade/politics)
 * @returns Updated game state
 */
export async function drawProgressCardAction(
    roomId: string,
    playerId: string,
    category: ProgressCardCategory
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Progress cards are only available in Cities & Knights mode');
    }

    // 3. Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 4. Draw card
    const card = drawProgressCard(gameState, playerId, category);
    if (!card) {
        throw new Error(`No cards remaining in ${category} deck`);
    }

    // 5. Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Handle player choosing which city to lose to barbarians
 * Called during barbarian_city_selection phase
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID of the city to lose
 * @returns Updated game state
 */
export async function loseCityToBarbarianAction(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // 1. Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // 2. Validate C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Barbarian attacks only occur in Cities & Knights mode');
    }

    // 3. Validate phase
    if (gameState.phase !== 'barbarian_city_selection') {
        throw new Error('Not in barbarian city selection phase');
    }

    // 4. Handle city loss
    const { loseCityToBarbarians } = require('@/core/engine/barbarian/barbarian-manager');
    loseCityToBarbarians(gameState, playerId, vertexId);

    // 5. Save to database
    await updateGameState(gameState);

    return gameState;
}
