import type { CommodityType } from '@/core/rules/commodity-constants';
import { TERRAIN_TO_COMMODITY } from '@/core/rules/commodity-constants';
import type { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { getResourceFromTerrain } from '@/core/rules/game-rules';
import { getCanonicalVertexId } from '@/lib/hex';
import type { GameState } from '@/lib/types/game';

export interface ProductionPreview {
    resources: Partial<Record<ResourceType, number>>;
    commodities: Partial<Record<CommodityType, number>>;
}

const EMPTY_PREVIEW: ProductionPreview = { resources: {}, commodities: {} };

/**
 * Calculate what one player would receive for a production total without
 * mutating the authoritative game state. This mirrors the resource and
 * commodity distribution rules used when the roll is resolved.
 */
export function getPlayerProductionPreview(
    gameState: GameState,
    playerId: string,
    diceTotal: number
): ProductionPreview {
    if (diceTotal === 7) return EMPTY_PREVIEW;

    const preview: ProductionPreview = { resources: {}, commodities: {} };
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
    const matchingHexes = gameState.board.hexes.filter(
        hex => hex.numberToken === diceTotal && hex.id !== gameState.robberHexId
    );

    for (const hex of matchingHexes) {
        const resource = getResourceFromTerrain(hex.terrain);
        const commodity = isCitiesAndKnights
            ? TERRAIN_TO_COMMODITY[hex.terrain as TerrainType]
            : undefined;
        const [q, r] = hex.id.split(',').map(Number);

        for (let d = 0; d < 6; d++) {
            const vertex = gameState.board.vertices[getCanonicalVertexId(q, r, d)];
            if (!vertex || vertex.owner !== playerId) continue;

            const isCity = vertex.structure === 'city' || vertex.structure === 'metropolis';
            if (!resource || !vertex.structure) continue;

            const isCommodityHex = isCitiesAndKnights && Boolean(commodity);
            const resourceAmount = vertex.structure === 'settlement'
                ? 1
                : isCommodityHex
                    ? 1
                    : 2;
            preview.resources[resource] = (preview.resources[resource] ?? 0) + resourceAmount;

            if (isCity && commodity) {
                preview.commodities[commodity] = (preview.commodities[commodity] ?? 0) + 1;
            }
        }
    }

    return preview;
}
