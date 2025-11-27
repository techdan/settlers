import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { upgradeImprovement, canAffordImprovement, tryAwardMetropolis, tryStealMetropolis } from '@/core/engine/improvements/improvement-manager';
import { ImprovementType } from '@/core/rules/commodity-constants';

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

    // 7. Check for Metropolis award/steal (v2.0 logic)
    // Level 4: Auto-award if unclaimed
    // Level 5: Steal from level 4 owner
    if (newLevel === 4) {
        tryAwardMetropolis(gameState, player, improvement);
    } else if (newLevel === 5) {
        tryStealMetropolis(gameState, player, improvement);
    }

    // 8. Save to database
    await updateGameState(gameState);

    return gameState;
}
