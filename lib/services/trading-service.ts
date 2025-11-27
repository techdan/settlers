import { GameState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { getPortForVertex, getBestTradeRatio } from '@/core/engine/board/port-generator';

/**
 * Trading Service
 * Orchestrates trading operations (bank and player-to-player)
 */

/**
 * Trade with the bank (4:1, 3:1, or 2:1 depending on ports)
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param giveResource - Resource to give
 * @param getResource - Resource to get
 * @returns Updated game state
 */
import { CommodityType } from '@/core/rules/commodity-constants';

// Helper to check if type is commodity
function isCommodity(type: string): type is CommodityType {
    return ['paper', 'cloth', 'coin'].includes(type);
}

export async function tradeWithBank(
    roomId: string,
    playerId: string,
    giveResource: ResourceType | CommodityType,
    getResource: ResourceType | CommodityType
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot trade in current phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Determine trade ratio
    let ratio = 4; // Default

    if (isCommodity(giveResource)) {
        // Commodities: Default 4:1, or 2:1 with Trading House (Trade improvement level 3+)
        if ((player.improvements?.trade || 0) >= 3) {
            ratio = 2;
        }
        // Note: Ports do NOT apply to commodities (unless Merchant Fleet card is active - handled separately/future)
    } else {
        // Resources: Use ports
        // Get all vertices owned by player
        const playerVertices = Object.keys(gameState.board.vertices).filter(
            vId => gameState.board.vertices[vId].owner === playerId
        );
        ratio = getBestTradeRatio(playerVertices, giveResource);
    }

    // Get current amount of 'give' item
    const currentAmount = isCommodity(giveResource)
        ? (player.commodities?.[giveResource] || 0)
        : (player.resources[giveResource] || 0);

    // Validate resources
    if (currentAmount < ratio) {
        throw new Error(`Not enough ${giveResource}. Need ${ratio} to trade.`);
    }

    // Execute trade
    // Deduct 'give'
    if (isCommodity(giveResource)) {
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        player.commodities[giveResource] -= ratio;
    } else {
        player.resources[giveResource] -= ratio;
    }

    // Add 'get'
    if (isCommodity(getResource)) {
        if (!player.commodities) player.commodities = { paper: 0, cloth: 0, coin: 0 };
        player.commodities[getResource] = (player.commodities[getResource] || 0) + 1;
    } else {
        player.resources[getResource]++;
    }

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} traded ${ratio} ${giveResource} for 1 ${getResource}`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Offer a trade to other players
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param give - Resources to give
 * @param get - Resources to get
 * @returns Updated game state
 */
export async function offerTrade(
    roomId: string,
    playerId: string,
    give: Record<ResourceType, number>,
    get: Record<ResourceType, number>
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot trade now');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate resources
    for (const [res, amount] of Object.entries(give)) {
        if ((player.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to offer`);
        }
    }

    // Create trade offer
    gameState.tradeOffer = {
        id: `${Date.now()}-${Math.random()}`,
        initiator: playerId,
        give,
        get,
        status: 'open'
    };

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} offered a trade`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Accept an active trade offer
 *
 * @param roomId - Room ID
 * @param playerId - Player ID (acceptor)
 * @returns Updated game state
 */
export async function acceptTrade(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate trade offer exists
    if (!gameState.tradeOffer || gameState.tradeOffer.status !== 'open') {
        throw new Error('No active trade offer');
    }

    if (gameState.tradeOffer.initiator === playerId) {
        throw new Error('Cannot accept your own trade');
    }

    // Get players
    const initiator = gameState.players.find(p => p.id === gameState.tradeOffer!.initiator);
    const acceptor = gameState.players.find(p => p.id === playerId);

    if (!initiator || !acceptor) throw new Error('Player not found');

    // Validate acceptor resources
    for (const [res, amount] of Object.entries(gameState.tradeOffer.get)) {
        if ((acceptor.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to accept trade`);
        }
    }

    // Execute trade
    // Initiator gives 'give', gets 'get'
    // Acceptor gives 'get', gets 'give'
    for (const [res, amount] of Object.entries(gameState.tradeOffer.give)) {
        initiator.resources[res as ResourceType] -= amount;
        acceptor.resources[res as ResourceType] += amount;
    }

    for (const [res, amount] of Object.entries(gameState.tradeOffer.get)) {
        acceptor.resources[res as ResourceType] -= amount;
        initiator.resources[res as ResourceType] += amount;
    }

    // Clear trade offer
    gameState.tradeOffer = null;

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${acceptor.name} accepted the trade`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Cancel an active trade offer
 *
 * @param roomId - Room ID
 * @param playerId - Player ID (must be initiator or current turn)
 * @returns Updated game state
 */
export async function cancelTrade(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate trade offer exists
    if (!gameState.tradeOffer) {
        throw new Error('No active trade offer');
    }

    // Only initiator or current turn player can cancel
    if (gameState.tradeOffer.initiator !== playerId && gameState.currentTurn !== playerId) {
        throw new Error('Only the trade initiator or current player can cancel');
    }

    // Clear trade offer
    gameState.tradeOffer = null;

    // Get player
    const player = gameState.players.find(p => p.id === playerId);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player?.name} cancelled the trade`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
