import { GameState, WeddingSelection, WeddingGiftItem } from '@/lib/types/game';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { addResources, removeResources } from '@/core/engine/resources/resource-manager';

/**
 * Wedding Helper Functions
 * These functions handle the multiplayer interaction logic for the Wedding card
 */

export function respondToWedding(
    gameState: GameState,
    playerId: string,
    selections: WeddingSelection[]
): void {
    const pendingWedding = gameState.pendingWedding;
    if (!pendingWedding) {
        throw new Error('No active Wedding requests');
    }

    const request = pendingWedding.requests.find(r => r.playerId === playerId);
    if (!request || request.status !== 'pending') {
        throw new Error('You are not required to give cards for Wedding');
    }

    const initiator = gameState.players.find(p => p.id === pendingWedding.initiatorId);
    const giver = gameState.players.find(p => p.id === playerId);

    if (!initiator || !giver) {
        throw new Error('Player not found');
    }

    const required = request.requiredCards;
    if (required <= 0) {
        throw new Error('No cards required for this Wedding request');
    }
    if (!Array.isArray(selections) || selections.length !== required) {
        throw new Error(`Select ${required} card${required === 1 ? '' : 's'} to give`);
    }

    const selectionCounts: Record<string, number> = {};
    for (const pick of selections) {
        if (!pick || (pick.type !== 'resource' && pick.type !== 'commodity') || !pick.value) {
            throw new Error('Invalid selection');
        }
        const key = `${pick.type}:${pick.value}`;
        selectionCounts[key] = (selectionCounts[key] || 0) + 1;
    }

    // Validate availability
    for (const [key, count] of Object.entries(selectionCounts)) {
        const [type, rawValue] = key.split(':');
        if (type === 'resource') {
            const available = giver.resources?.[rawValue as ResourceType] ?? 0;
            if (available < count) {
                throw new Error(`You don't have enough ${rawValue}`);
            }
        } else {
            const available = giver.commodities?.[rawValue as CommodityType] ?? 0;
            if (available < count) {
                throw new Error(`You don't have enough ${rawValue}`);
            }
        }
    }

    const givenItems: WeddingGiftItem[] = [];

    // Transfer cards
    for (const [key, count] of Object.entries(selectionCounts)) {
        const [type, rawValue] = key.split(':');

        if (type === 'resource') {
            const resource = rawValue as ResourceType;
            removeResources(giver, { [resource]: count });
            addResources(initiator, { [resource]: count });
        } else {
            if (!giver.commodities) giver.commodities = { paper: 0, cloth: 0, coin: 0 };
            if (!initiator.commodities) initiator.commodities = { paper: 0, cloth: 0, coin: 0 };
            giver.commodities[rawValue as CommodityType] -= count;
            initiator.commodities[rawValue as CommodityType] += count;
        }

        givenItems.push({
            type: type as 'resource' | 'commodity',
            value: rawValue as ResourceType | CommodityType,
            count
        });
    }

    request.status = 'completed';
    request.given = givenItems;

    const totalGiven = selections.length;
    gameState.lastTheft = {
        source: 'wedding',
        victimId: giver.id,
        thiefId: initiator.id,
        items: givenItems,
        victims: [{ victimId: giver.id, items: givenItems }],
        timestamp: Date.now()
    };

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${giver.name} gave ${totalGiven} card${totalGiven === 1 ? '' : 's'} to ${initiator.name} with Wedding`,
        playerId: initiator.id
    });

    const hasPending = pendingWedding.requests.some(r => r.status === 'pending');
    if (!hasPending) {
        gameState.pendingWedding = undefined;
    }
}
