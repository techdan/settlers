import type { GameState } from '@/lib/types';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import { isMerchantFleetEffect, type MerchantFleetEffect } from '@/lib/types/effects';
import { getBestTradeRatio } from '@/core/engine/board/port-generator';

/**
 * Bank trade ratios — the single source of truth for "how many of X buys one card?"
 *
 * The trade modal needs a ratio for *every* item so it can print a badge on each
 * token, and the trading service needs one for the item actually being traded.
 * Both call in here: a badge that disagreed with what the server charges would be
 * worse than no badge at all.
 */

export type TradeItem = ResourceType | CommodityType;

export const TRADE_RESOURCES: readonly ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
export const TRADE_COMMODITIES: readonly CommodityType[] = ['paper', 'cloth', 'coin'];
export const ALL_TRADE_ITEMS: readonly TradeItem[] = [...TRADE_RESOURCES, ...TRADE_COMMODITIES];

/** Trade improvement level that unlocks the Trading House 2:1 on commodities. */
const TRADING_HOUSE_LEVEL = 3;

const TERRAIN_TO_RESOURCE: Record<string, ResourceType | null> = {
    forest: 'wood',
    hill: 'brick',
    pasture: 'sheep',
    field: 'wheat',
    mountain: 'ore',
    desert: null,
    ocean: null,
};

export function isCommodity(type: string): type is CommodityType {
    return (TRADE_COMMODITIES as readonly string[]).includes(type);
}

/** The resource the Merchant currently sits on, if any. */
function getMerchantResource(gameState: GameState): ResourceType | null {
    if (!gameState.merchantHexId) return null;
    const merchantHex = gameState.board.hexes.find(hex => hex.id === gameState.merchantHexId);
    if (!merchantHex) return null;
    return TERRAIN_TO_RESOURCE[merchantHex.terrain] ?? null;
}

/** The item this player's Merchant Fleet card discounts this turn, if any. */
function getMerchantFleetTradeItem(gameState: GameState, playerId: string): TradeItem | null {
    const effect = (gameState.activeEffects ?? []).find(
        (entry): entry is MerchantFleetEffect =>
            isMerchantFleetEffect(entry) && entry.playerId === playerId
    );
    return effect?.tradeItem ?? null;
}

/**
 * How many `item` cards the bank charges this player for one card of anything else.
 *
 * Precedence, highest discount first:
 *   1. Merchant Fleet — 2:1 on the named item for the turn.
 *   2. Commodities — 2:1 with a Trading House (Trade level 3+), otherwise 4:1.
 *      Ports never apply to commodities.
 *   3. Merchant — 2:1 on the resource under the Merchant, for whoever holds it.
 *   4. Ports — 2:1 on a matching port, 3:1 on a generic one, else 4:1.
 */
export function getBankTradeRatio(gameState: GameState, playerId: string, item: TradeItem): number {
    if (getMerchantFleetTradeItem(gameState, playerId) === item) return 2;

    if (isCommodity(item)) {
        const player = gameState.players.find(p => p.id === playerId);
        return (player?.improvements?.trade || 0) >= TRADING_HOUSE_LEVEL ? 2 : 4;
    }

    if (gameState.activeMerchant === playerId && getMerchantResource(gameState) === item) return 2;

    const ownedVertices = Object.keys(gameState.board.vertices).filter(
        vertexId => gameState.board.vertices[vertexId].owner === playerId
    );
    return getBestTradeRatio(ownedVertices, item);
}

/** Every ratio at once — what the trade modal prints on its tokens. */
export function getBankTradeRatios(gameState: GameState, playerId: string): Record<TradeItem, number> {
    return ALL_TRADE_ITEMS.reduce((ratios, item) => {
        ratios[item] = getBankTradeRatio(gameState, playerId, item);
        return ratios;
    }, {} as Record<TradeItem, number>);
}
