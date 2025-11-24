import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { distributeResources, getTotalResources } from '@/core/engine/resources/resource-manager';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { checkVictoryCondition } from '@/core/rules/victory-conditions';

/**
 * Game Service
 * Orchestrates core game operations (dice, turns, etc.)
 */

/**
 * Roll dice and distribute resources
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @returns Updated game state with dice roll
 */
export async function rollDice(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'waiting_for_roll') {
        throw new Error('Not waiting for dice roll');
    }

    // Roll dice
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    gameState.diceRoll = { d1, d2, total };

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} rolled ${d1} + ${d2} = ${total}`,
        playerId
    });

    // Handle robber (7)
    if (total === 7) {
        // Check if any players need to discard
        const playersToDiscard = gameState.players.filter(
            p => getTotalResources(p) > GAME_CONSTANTS.DISCARD_THRESHOLD
        );

        if (playersToDiscard.length > 0) {
            gameState.phase = 'discarding';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `Players with more than ${GAME_CONSTANTS.DISCARD_THRESHOLD} cards must discard half`
            });
        } else {
            gameState.phase = 'robber_placement';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${player.name} must move the robber`
            });
        }
    } else {
        // Distribute resources
        distributeResources(gameState, total);
        gameState.phase = 'main_phase';
    }

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * End current player's turn
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @returns Updated game state
 */
export async function endTurn(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only end turn during main phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Move to next player
    const currentIndex = gameState.turnOrder.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[nextIndex];
    gameState.phase = 'waiting_for_roll';

    // Clear dice roll
    gameState.diceRoll = undefined;

    // Clear trade offer
    gameState.tradeOffer = null;

    // Add log
    const nextPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} ended their turn. ${nextPlayer?.name}'s turn begins.`
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Check and update game victory condition
 * 
 * @param gameState - Current game state
 * @returns Winner ID if someone won, null otherwise
 */
export function checkAndUpdateVictory(gameState: GameState): string | null {
    const winnerId = checkVictoryCondition(gameState);

    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';

        const winner = gameState.players.find(p => p.id === winnerId);
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`
        });
    }

    return winnerId;
}
