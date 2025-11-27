import { GameState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { getCanonicalVertexId } from '@/lib/hex';
import { stealRandomResource, getTotalResources } from '@/core/engine/resources/resource-manager';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';

/**
 * Robber Service
 * Orchestrates robber-related operations
 */

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

    // Find potential victims if not provided
    let targetVictimId = victimId;
    if (!targetVictimId) {
        const [q, r] = hexId.split(',').map(Number);
        const potentialVictims = new Set<string>();

        for (let d = 0; d < 6; d++) {
            const vId = getCanonicalVertexId(q, r, d);
            const vertex = gameState.board.vertices[vId];
            if (vertex && vertex.owner && vertex.owner !== playerId) {
                // Check if they have resources
                const victim = gameState.players.find(p => p.id === vertex.owner);
                if (victim && getTotalResources(victim) > 0) {
                    potentialVictims.add(vertex.owner);
                }
            }
        }

        if (potentialVictims.size > 0) {
            const victimsArray = Array.from(potentialVictims);
            targetVictimId = victimsArray[Math.floor(Math.random() * victimsArray.length)];
        }
    }

    if (targetVictimId) {
        const victim = gameState.players.find(p => p.id === targetVictimId);
        const thief = gameState.players.find(p => p.id === playerId);

        if (victim && thief) {
            const stolenResource = stealRandomResource(victim);
            if (stolenResource) {
                thief.resources[stolenResource]++;
                stealLog = ` and stole a card from ${victim.name}`;
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

    const currentTotal = getTotalResources(player);

    // City walls increase the discard threshold for robber/7
    // Base threshold is 7, each wall adds +2
    const discardThreshold = getRobberDiscardThreshold(gameState, playerId);

    // If player has <= threshold cards, they shouldn't be discarding
    if (currentTotal <= discardThreshold) {
        throw new Error('No need to discard');
    }

    const discardCount = Object.values(resources).reduce((a, b) => a + b, 0);
    const requiredDiscard = Math.floor(currentTotal / 2);

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

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} discarded ${discardCount} cards`,
        playerId
    });

    // Check if everyone is done
    const pendingPlayers = gameState.players.filter(p => {
        const total = getTotalResources(p);
        const threshold = getRobberDiscardThreshold(gameState, p.id);
        if (total <= threshold) return false;
        return !p.discardedThisTurn;
    });

    if (pendingPlayers.length === 0) {
        gameState.phase = 'robber_placement';
        // Reset flags
        gameState.players.forEach(p => p.discardedThisTurn = false);

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `All discards complete. Move the robber.`
        });
    }

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
