import { GameState } from '@/lib/types/game';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { addResources, removeResources } from '@/core/engine/resources/resource-manager';

/**
 * Commercial Harbor Helper Functions
 * These functions handle the multiplayer trading logic for the Commercial Harbor card
 */

export function makeCommercialHarborOffers(
    gameState: GameState,
    initiatorId: string,
    offers: { targetPlayerId: string; offeredResource: ResourceType | null }[]
): void {
    if (!gameState.pendingCommercialHarbor) {
        throw new Error('No active Commercial Harbor session');
    }

    const harbor = gameState.pendingCommercialHarbor;

    if (harbor.initiatorId !== initiatorId) {
        throw new Error('Only the initiator can make offers');
    }

    if (harbor.offers && harbor.offers.length > 0) {
        throw new Error('Offers have already been made');
    }

    const initiator = gameState.players.find(p => p.id === initiatorId);
    if (!initiator) {
        throw new Error('Player not found');
    }

    // Validate all offers
    const resourcesNeeded: Partial<Record<ResourceType, number>> = {};
    for (const offer of offers) {
        if (offer.offeredResource === null) continue; // "No Trade"

        if (offer.targetPlayerId === initiatorId) {
            throw new Error('Cannot trade with yourself');
        }

        const target = gameState.players.find(p => p.id === offer.targetPlayerId);
        if (!target) {
            throw new Error(`Player ${offer.targetPlayerId} not found`);
        }

        resourcesNeeded[offer.offeredResource] = (resourcesNeeded[offer.offeredResource] || 0) + 1;
    }

    // Check initiator has all required resources
    for (const [resource, count] of Object.entries(resourcesNeeded)) {
        if ((initiator.resources[resource as ResourceType] || 0) < count) {
            throw new Error(`You need ${count} ${resource} but only have ${initiator.resources[resource as ResourceType] || 0}`);
        }
    }

    // Set offers
    harbor.offers = offers.map(o => ({ ...o }));

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${initiator.name} made offers with Commercial Harbor`,
        playerId: initiatorId
    });
}

export function respondToCommercialHarbor(
    gameState: GameState,
    playerId: string,
    commodity: 'paper' | 'cloth' | 'coin' | null
): void {
    if (!gameState.pendingCommercialHarbor) {
        throw new Error('No active Commercial Harbor offer');
    }

    const harbor = gameState.pendingCommercialHarbor;

    // Find this player's offer
    const offer = harbor.offers.find(o => o.targetPlayerId === playerId);
    if (!offer || offer.offeredResource === null) {
        throw new Error('No offer for you');
    }

    if (offer.response !== undefined) {
        throw new Error('You have already responded');
    }

    const player = gameState.players.find(p => p.id === playerId);
    const initiator = gameState.players.find(p => p.id === harbor.initiatorId);

    if (!player || !initiator) {
        throw new Error('Player not found');
    }

    const offeredResource = offer.offeredResource;

    if (commodity) {
        // Player has commodities and is giving one
        if (!player.commodities || player.commodities[commodity] <= 0) {
            throw new Error(`You don't have any ${commodity} to give`);
        }

        // Execute the trade
        player.commodities[commodity] -= 1;
        removeResources(initiator, { [offeredResource]: 1 });
        addResources(player, { [offeredResource]: 1 });

        if (!initiator.commodities) {
            initiator.commodities = { paper: 0, cloth: 0, coin: 0 };
        }
        initiator.commodities[commodity] += 1;

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} gave ${commodity} in exchange for ${offeredResource}`,
            playerId
        });
    } else {
        // Player has no commodities - resource is returned (no trade happens)
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} had no commodities - ${offeredResource} returned to ${initiator.name}`,
            playerId
        });
    }

    // Record response
    offer.response = commodity;

    // Check if all offers have been responded to
    const allResponded = harbor.offers.every(o =>
        o.offeredResource === null || o.response !== undefined
    );

    if (allResponded) {
        const tradesCompleted = harbor.offers.filter(o => o.response).length;
        const commoditiesReceived = harbor.offers.filter(o => o.response !== null && o.response !== undefined).length;

        // Remove card from player's hand
        const initiatorPlayer = gameState.players.find(p => p.id === harbor.initiatorId);
        if (initiatorPlayer && initiatorPlayer.progressCards) {
            const cardIndex = initiatorPlayer.progressCards.indexOf('commercial_harbor');
            if (cardIndex !== -1) {
                initiatorPlayer.progressCards.splice(cardIndex, 1);
            }
        }

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Commercial Harbor complete: ${initiator.name} received ${commoditiesReceived} commodities from ${tradesCompleted} trades`,
            playerId: harbor.initiatorId
        });

        gameState.pendingCommercialHarbor = undefined;
    }
}
