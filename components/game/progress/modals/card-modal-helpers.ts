import { getCanonicalVertexId } from '@/lib/hex';
import type { GameState } from '@/lib/types/game';
import type { CommodityType } from '@/core/rules/commodity-constants';
import type { ResourceType, TerrainType } from '@/core/rules/board-constants';

export const RESOURCES: ResourceType[] = [
    'wood',
    'brick',
    'wheat',
    'sheep',
    'ore',
];

export const COMMODITIES: CommodityType[] = ['paper', 'cloth', 'coin'];

export interface OpponentHandEntry {
    type: 'resource' | 'commodity';
    value: ResourceType | CommodityType;
    available: number;
}

export function getOpponentHandCounts(
    gameState: GameState,
    opponentId: string
): OpponentHandEntry[] {
    const opponent = gameState.players.find(player => player.id === opponentId);
    if (!opponent) return [];

    const entries: OpponentHandEntry[] = [];
    Object.entries(opponent.resources ?? {}).forEach(([resource, count]) => {
        if (count > 0) {
            entries.push({
                type: 'resource',
                value: resource as ResourceType,
                available: count,
            });
        }
    });
    Object.entries(opponent.commodities ?? {}).forEach(([commodity, count]) => {
        if (count > 0) {
            entries.push({
                type: 'commodity',
                value: commodity as CommodityType,
                available: count,
            });
        }
    });
    return entries;
}

export function getOpponentHandSize(
    gameState: GameState,
    opponentId: string
): number {
    return getOpponentHandCounts(gameState, opponentId).reduce(
        (sum, item) => sum + item.available,
        0
    );
}

export function getOpponentResourceCount(
    gameState: GameState,
    opponentId: string
): number {
    const opponent = gameState.players.find(player => player.id === opponentId);
    if (!opponent) return 0;
    return RESOURCES.reduce(
        (sum, resource) => sum + (opponent.resources?.[resource] ?? 0),
        0
    );
}

export function calculateProductionGain(
    gameState: GameState,
    playerId: string,
    terrain: Extract<TerrainType, 'field' | 'mountain'>
): { adjacentHexes: number; cardsGained: number } {
    let adjacentHexes = 0;

    for (const hex of gameState.board.hexes ?? []) {
        if (hex.terrain !== terrain) continue;
        const [q, r] = (hex.id ?? '').split(',').map(Number);
        if (Number.isNaN(q) || Number.isNaN(r)) continue;

        const hasAdjacentBuilding = Array.from(
            { length: 6 },
            (_, direction) => getCanonicalVertexId(q, r, direction)
        ).some(vertexId => {
            const vertex = gameState.board.vertices[vertexId];
            return (
                vertex?.owner === playerId &&
                (vertex.structure === 'settlement' ||
                    vertex.structure === 'city' ||
                    vertex.structure === 'metropolis')
            );
        });

        if (hasAdjacentBuilding) adjacentHexes += 1;
    }

    return { adjacentHexes, cardsGained: adjacentHexes * 2 };
}
