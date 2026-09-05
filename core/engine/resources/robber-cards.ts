import type { GameState, PlayerState } from '@/lib/types';
import type { TheftItem } from '@/lib/types/game';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import { getCanonicalVertexId } from '@/lib/hex';
import { getTotalResources } from './resource-manager';
import { getTotalCommodities } from './commodity-manager';

export function getRobberCardCount(player: PlayerState, includeCommodities: boolean): number {
    return getTotalResources(player) + (includeCommodities ? getTotalCommodities(player) : 0);
}

export function getRobberVictims(game: GameState, thiefId: string, hexId: string): string[] {
    const hex = game.board.hexes.find(h => h.id === hexId);
    if (!hex) return [];
    const [q, r] = hex.id.split(',').map(Number);
    const owners = new Set<string>();
    for (let d = 0; d < 6; d++) {
        const vertex = game.board.vertices[getCanonicalVertexId(q, r, d)];
        if (vertex?.owner && vertex.owner !== thiefId &&
            (vertex.structure === 'settlement' || vertex.structure === 'city' || vertex.structure === 'metropolis')) {
            owners.add(vertex.owner);
        }
    }
    return game.players.filter(p => owners.has(p.id) && getRobberCardCount(p, game.gameMode === 'cities_and_knights') > 0).map(p => p.id);
}

/** Every resource/commodity card has equal probability; progress cards are excluded. */
export function stealRobberCard(victim: PlayerState, thief: PlayerState, includeCommodities: boolean): TheftItem | null {
    const cards: TheftItem[] = [];
    for (const [value, count] of Object.entries(victim.resources)) {
        for (let i = 0; i < count; i++) cards.push({ type: 'resource', value: value as ResourceType, count: 1 });
    }
    if (includeCommodities) {
        for (const [value, count] of Object.entries(victim.commodities ?? {})) {
            for (let i = 0; i < count; i++) cards.push({ type: 'commodity', value: value as CommodityType, count: 1 });
        }
    }
    if (!cards.length) return null;
    const card = cards[Math.floor(Math.random() * cards.length)];
    if (card.type === 'resource') {
        victim.resources[card.value]--;
        thief.resources[card.value]++;
    } else if (card.type === 'commodity') {
        victim.commodities![card.value]--;
        thief.commodities ??= { paper: 0, cloth: 0, coin: 0 };
        thief.commodities[card.value]++;
    }
    return card;
}
