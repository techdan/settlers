import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { getCanonicalVertexId } from '@/lib/hex';
import { stealRandomResource, getTotalResources } from '@/core/engine/resources/resource-manager';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';

/**
 * Robber Service
 * Orchestrates robber-related operations
 */

function getRequiredDiscardCount(gameState: GameState, playerId: string): number {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 0;

    const totalResources = getTotalResources(player);
    const context = gameState.discardContext;

    if (context?.type === 'sabotage') {
        if (!context.targetIds?.includes(playerId)) return 0;
        return Math.floor(totalResources / 2);
    }

    const discardThreshold = getRobberDiscardThreshold(gameState, playerId);
    if (totalResources <= discardThreshold) return 0;
    return Math.floor(totalResources / 2);
}

/**
 * Move the robber to a new hex and optionally steal from a player
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param hexId - Hex ID to move robber to
 * @param victimId - Optional victim ID to steal from
 * @returns Updated game state
 */
export async function moveRobber(
    roomId: string,
    playerId: string,
    hexId: string,
    victimId?: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'robber_placement') {
        throw new Error('Cannot move robber in current phase');
    }

    // Validate move
    if (hexId === gameState.robberHexId) {
        throw new Error('Robber must be moved to a new hex');
    }

    // Update robber location
    gameState.robberHexId = hexId;

    // Steal resource
    let stealLog = '';

    // Victim should be selected by the client before calling this action
    // No random selection on server side
    if (victimId) {
        const victim = gameState.players.find(p => p.id === victimId);
        const thief = gameState.players.find(p => p.id === playerId);

        if (victim && thief) {
            const stolenResource = stealRandomResource(victim);
            if (stolenResource) {
                thief.resources[stolenResource]++;
                stealLog = ` and stole a card from ${victim.name}`;

                // Record theft for UI highlighting
                gameState.lastTheft = {
                    victimId: victim.id,
                    thiefId: thief.id,
                    items: [{ type: 'resource', value: stolenResource, count: 1 }],
                    victims: [{ victimId: victim.id, items: [{ type: 'resource', value: stolenResource, count: 1 }] }],
                    timestamp: Date.now()
                };
            } else {
                stealLog = ` but ${victim.name} had no cards to steal`;
            }
        }
    }

    // Update phase
    gameState.phase = 'main_phase';

    // Get player
    const player = gameState.players.find(p => p.id === playerId);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player?.name} moved the robber${stealLog}`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Discard half of player's cards when they have more than 7 during a 7 roll
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param resources - Resources to discard
 * @returns Updated game state
 */
export async function discardCards(
    roomId: string,
    playerId: string,
    resources: Record<ResourceType, number>
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate phase
    if (gameState.phase !== 'discarding') {
        throw new Error('Not in discarding phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const requiredDiscard = getRequiredDiscardCount(gameState, playerId);
    if (requiredDiscard === 0) {
        throw new Error('No need to discard');
    }

    const currentTotal = getTotalResources(player);
    const discardCount = Object.values(resources).reduce((a, b) => a + b, 0);

    if (discardCount !== requiredDiscard) {
        throw new Error(`Must discard exactly ${requiredDiscard} cards`);
    }

    // Validate and deduct resources
    for (const [res, amount] of Object.entries(resources)) {
        if ((player.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to discard`);
        }
        player.resources[res as ResourceType] -= amount;
    }

    player.discardedThisTurn = true;

    // Build detailed discard message
    const discardedItems = Object.entries(resources)
        .filter(([_, amount]) => amount > 0)
        .map(([res, amount]) => `${amount} ${res}`)
        .join(', ');

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} discarded ${discardCount} cards (${discardedItems})`,
        playerId
    });

    // Check if everyone is done
    const pendingPlayers = gameState.players.filter(p => {
        const needed = getRequiredDiscardCount(gameState, p.id);
        if (needed === 0) return false;
        return !p.discardedThisTurn;
    });

    if (pendingPlayers.length === 0) {
        if (gameState.discardContext?.type === 'sabotage') {
            gameState.phase = 'main_phase';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `All Sabotage discards complete. Play continues.`
            });
        } else {
            // C&K Rule: Robber doesn't move until first barbarian attack
            if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
                gameState.phase = 'main_phase';
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `All discards complete. Robber stays in desert (no barbarian attack yet).`
                });
            } else {
                gameState.phase = 'robber_placement';
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `All discards complete. Move the robber.`
                });
            }
        }
        gameState.discardContext = undefined;
        // Reset flags
        gameState.players.forEach(p => p.discardedThisTurn = false);
    }

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
