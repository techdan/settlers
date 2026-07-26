import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { isMerchantFleetEffect, type MerchantFleetEffect } from '@/lib/types/effects';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { getPortForVertex, getBestTradeRatio } from '@/core/engine/board/port-generator';
import { CommodityType } from '@/core/rules/commodity-constants';

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
// Helper to check if type is commodity
function isCommodity(type: string): type is CommodityType {
    return ['paper', 'cloth', 'coin'].includes(type);
}

const terrainToResource: Record<string, ResourceType | null> = {
    forest: 'wood',
    hill: 'brick',
    pasture: 'sheep',
    field: 'wheat',
    mountain: 'ore',
    desert: null,
    ocean: null
};

function getMerchantResource(gameState: GameState): ResourceType | null {
    if (!gameState.merchantHexId) return null;
    const merchantHex = gameState.board.hexes.find(hex => hex.id === gameState.merchantHexId);
    if (!merchantHex) return null;
    return terrainToResource[merchantHex.terrain] ?? null;
}

function getMerchantFleetTradeItem(gameState: GameState, playerId: string): ResourceType | CommodityType | null {
    const activeEffects = gameState.activeEffects ?? [];
    const effect = activeEffects.find(
        (entry): entry is MerchantFleetEffect =>
            isMerchantFleetEffect(entry) && entry.playerId === playerId
    );

    return effect?.tradeItem ?? null;
}

function formatResourceList(resources: Record<ResourceType, number>): string {
    const parts = Object.entries(resources)
        .filter(([, amount]) => amount > 0)
        .map(([res, amount]) => `${amount} ${res}`);

    return parts.length ? parts.join(', ') : 'nothing';
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
    const merchantFleetTradeItem = getMerchantFleetTradeItem(gameState, playerId);
    const merchantResource = getMerchantResource(gameState);

    if (merchantFleetTradeItem === giveResource) {
        ratio = 2;
    } else if (isCommodity(giveResource)) {
        // Commodities: Default 4:1, or 2:1 with Trading House (Trade improvement level 3+)
        if ((player.improvements?.trade || 0) >= 3) {
            ratio = 2;
        }
        // Note: Ports do NOT apply to commodities
    } else {
        // Resources: Merchant benefit or ports
        if (gameState.activeMerchant === playerId && merchantResource === giveResource) {
            ratio = 2;
        } else {
            // Get all vertices owned by player
            const playerVertices = Object.keys(gameState.board.vertices).filter(
                vId => gameState.board.vertices[vId].owner === playerId
            );
            ratio = getBestTradeRatio(playerVertices, giveResource);
        }
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
 * @param giveCommodities - Commodities to give (optional)
 * @param getCommodities - Commodities to get (optional)
 * @returns Updated game state
 */
export async function offerTrade(
    roomId: string,
    playerId: string,
    give: Record<ResourceType, number>,
    get: Record<ResourceType, number>,
    giveCommodities?: Record<CommodityType, number>,
    getCommodities?: Record<CommodityType, number>
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

    // Validate commodities
    if (giveCommodities) {
        for (const [comm, amount] of Object.entries(giveCommodities)) {
            if ((player.commodities?.[comm as CommodityType] || 0) < amount) {
                throw new Error(`Not enough ${comm} to offer`);
            }
        }
    }

    // Validate trade is not empty or one-sided (official Catan rules)
    const givingResourcesTotal = Object.values(give).reduce((sum, val) => sum + val, 0);
    const givingCommoditiesTotal = giveCommodities ? Object.values(giveCommodities).reduce((sum, val) => sum + val, 0) : 0;
    const gettingResourcesTotal = Object.values(get).reduce((sum, val) => sum + val, 0);
    const gettingCommoditiesTotal = getCommodities ? Object.values(getCommodities).reduce((sum, val) => sum + val, 0) : 0;

    const totalGiving = givingResourcesTotal + givingCommoditiesTotal;
    const totalGetting = gettingResourcesTotal + gettingCommoditiesTotal;

    if (totalGiving === 0 || totalGetting === 0) {
        throw new Error('Both players must exchange at least one resource or commodity. Giving away resources for free is not allowed.');
    }

    // Create trade offer
    gameState.tradeOffer = {
        id: `${Date.now()}-${Math.random()}`,
        initiator: playerId,
        give,
        get,
        giveCommodities,
        getCommodities,
        status: 'open',
        rejectedBy: []
    };

    // Format trade message
    const giveItems: string[] = [];
    if (Object.values(give).some(v => v > 0)) {
        giveItems.push(formatResourceList(give));
    }
    if (giveCommodities && Object.values(giveCommodities).some(v => v > 0)) {
        const commParts = Object.entries(giveCommodities)
            .filter(([, amount]) => amount > 0)
            .map(([comm, amount]) => `${amount} ${comm}`);
        if (commParts.length) giveItems.push(commParts.join(', '));
    }

    const getItems: string[] = [];
    if (Object.values(get).some(v => v > 0)) {
        getItems.push(formatResourceList(get));
    }
    if (getCommodities && Object.values(getCommodities).some(v => v > 0)) {
        const commParts = Object.entries(getCommodities)
            .filter(([, amount]) => amount > 0)
            .map(([comm, amount]) => `${amount} ${comm}`);
        if (commParts.length) getItems.push(commParts.join(', '));
    }

    const giveText = giveItems.length ? giveItems.join(', ') : 'nothing';
    const getText = getItems.length ? getItems.join(', ') : 'nothing';

    // Add public log entry (no playerId = visible to all players)
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} offered a trade: give ${giveText} for ${getText}`
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

    // Validate acceptor commodities
    if (gameState.tradeOffer.getCommodities) {
        for (const [comm, amount] of Object.entries(gameState.tradeOffer.getCommodities)) {
            if ((acceptor.commodities?.[comm as CommodityType] || 0) < amount) {
                throw new Error(`Not enough ${comm} to accept trade`);
            }
        }
    }

    // Execute trade
    // Initiator gives 'give', gets 'get'
    // Acceptor gives 'get', gets 'give'

    // Transfer resources
    for (const [res, amount] of Object.entries(gameState.tradeOffer.give)) {
        initiator.resources[res as ResourceType] -= amount;
        acceptor.resources[res as ResourceType] += amount;
    }

    for (const [res, amount] of Object.entries(gameState.tradeOffer.get)) {
        acceptor.resources[res as ResourceType] -= amount;
        initiator.resources[res as ResourceType] += amount;
    }

    // Transfer commodities
    if (gameState.tradeOffer.giveCommodities) {
        if (!initiator.commodities) initiator.commodities = { paper: 0, cloth: 0, coin: 0 };
        if (!acceptor.commodities) acceptor.commodities = { paper: 0, cloth: 0, coin: 0 };

        for (const [comm, amount] of Object.entries(gameState.tradeOffer.giveCommodities)) {
            initiator.commodities[comm as CommodityType] -= amount;
            acceptor.commodities[comm as CommodityType] += amount;
        }
    }

    if (gameState.tradeOffer.getCommodities) {
        if (!initiator.commodities) initiator.commodities = { paper: 0, cloth: 0, coin: 0 };
        if (!acceptor.commodities) acceptor.commodities = { paper: 0, cloth: 0, coin: 0 };

        for (const [comm, amount] of Object.entries(gameState.tradeOffer.getCommodities)) {
            acceptor.commodities[comm as CommodityType] -= amount;
            initiator.commodities[comm as CommodityType] += amount;
        }
    }

    // Format log message
    const giveItems: string[] = [];
    if (Object.values(gameState.tradeOffer.give).some(v => v > 0)) {
        giveItems.push(formatResourceList(gameState.tradeOffer.give));
    }
    if (gameState.tradeOffer.giveCommodities && Object.values(gameState.tradeOffer.giveCommodities).some(v => v > 0)) {
        const commParts = Object.entries(gameState.tradeOffer.giveCommodities)
            .filter(([, amount]) => amount > 0)
            .map(([comm, amount]) => `${amount} ${comm}`);
        if (commParts.length) giveItems.push(commParts.join(', '));
    }

    const getItems: string[] = [];
    if (Object.values(gameState.tradeOffer.get).some(v => v > 0)) {
        getItems.push(formatResourceList(gameState.tradeOffer.get));
    }
    if (gameState.tradeOffer.getCommodities && Object.values(gameState.tradeOffer.getCommodities).some(v => v > 0)) {
        const commParts = Object.entries(gameState.tradeOffer.getCommodities)
            .filter(([, amount]) => amount > 0)
            .map(([comm, amount]) => `${amount} ${comm}`);
        if (commParts.length) getItems.push(commParts.join(', '));
    }

    const offeredGive = giveItems.length ? giveItems.join(', ') : 'nothing';
    const offeredGet = getItems.length ? getItems.join(', ') : 'nothing';

    // Store trade completion data for UI notifications
    gameState.lastTrade = {
        initiatorId: gameState.tradeOffer.initiator,
        acceptorId: playerId,
        initiatorGave: {
            resources: gameState.tradeOffer.give,
            commodities: gameState.tradeOffer.giveCommodities
        },
        initiatorReceived: {
            resources: gameState.tradeOffer.get,
            commodities: gameState.tradeOffer.getCommodities
        },
        timestamp: Date.now()
    };

    // Clear trade offer
    gameState.tradeOffer = null;

    // Add public log entry (no playerId = visible to all players)
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Trade completed: ${initiator.name} traded ${offeredGive} to ${acceptor.name} for ${offeredGet}`
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Reject an active trade offer
 *
 * @param roomId - Room ID
 * @param playerId - Player ID (rejector, cannot be initiator)
 * @returns Updated game state
 */
export async function rejectTrade(
    roomId: string,
    playerId: string
): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    const offer = gameState.tradeOffer;

    if (!offer || offer.status !== 'open') {
        throw new Error('No active trade offer');
    }

    if (offer.initiator === playerId) {
        throw new Error('Trade initiator should cancel instead of rejecting');
    }

    const rejector = gameState.players.find(p => p.id === playerId);
    const initiator = gameState.players.find(p => p.id === offer.initiator);

    if (!rejector || !initiator) {
        throw new Error('Player not found');
    }

    // Add player to rejectedBy array if not already there
    if (!offer.rejectedBy) {
        offer.rejectedBy = [];
    }
    if (!offer.rejectedBy.includes(playerId)) {
        offer.rejectedBy.push(playerId);
    }

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${rejector.name} rejected your trade offer.`,
        playerId: initiator.id
    });

    // Once every possible responder has rejected, the offer can never be
    // accepted — retire it instead of leaving a dead offer on screen until the
    // initiator notices and cancels manually.
    const responders = gameState.players.filter(p => p.id !== offer.initiator);
    const allRejected = responders.every(p => offer.rejectedBy?.includes(p.id));

    if (allRejected) {
        gameState.tradeOffer = null;
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `All players rejected ${initiator.name}'s trade offer.`
        });
    }

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

    // Add public log entry (no playerId = visible to all players)
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player?.name} cancelled the trade offer`
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
