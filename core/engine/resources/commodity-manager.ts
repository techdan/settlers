import { GameState, PlayerState } from '@/lib/types';
import { getCanonicalVertexId } from '@/lib/hex';
import { CommodityType, TERRAIN_TO_COMMODITY } from '@/core/rules/commodity-constants';
import { TerrainType } from '@/core/rules/board-constants';

export type CommodityDistribution = Record<string, Partial<Record<CommodityType, number>>>;

/**
 * Commodity Manager (Cities & Knights Expansion)
 * Handles commodity distribution and calculations
 *
 * Key rules:
 * - Only CITIES produce commodities (settlements produce resources only)
 * - Cities produce 1 commodity per producing hex (not 2 like resources)
 * - Only specific terrains produce commodities: forest→paper, pasture→cloth, mountain→coin
 * - Hills, fields, and desert hexes do not produce commodities
 */

/**
 * Get the commodity produced by a terrain type
 *
 * @param terrain - Terrain type
 * @returns Commodity type or null if terrain doesn't produce commodities
 */
export function getCommodityFromTerrain(terrain: TerrainType): CommodityType | null {
    return TERRAIN_TO_COMMODITY[terrain] || null;
}

/**
 * Distribute commodities for a dice roll (C&K expansion only)
 * Only called when gameMode === 'cities_and_knights'
 *
 * @param gameState - Current game state
 * @param diceTotal - Total of dice roll
 * @returns Commodity distribution map
 */
export function distributeCommodities(gameState: GameState, diceTotal: number): CommodityDistribution {
    // Skip if not C&K mode
    if (gameState.gameMode !== 'cities_and_knights') return {};

    // Skip if robber roll (7)
    if (diceTotal === 7) return {};

    // Find all hexes with this number
    const matchingHexes = gameState.board.hexes.filter(
        hex => hex.numberToken === diceTotal && hex.id !== gameState.robberHexId
    );

    // Track commodities given to each player
    const distribution: CommodityDistribution = {};

    // For each matching hex, give commodities to adjacent cities
    for (const hex of matchingHexes) {
        // Get commodity from terrain
        const commodity = getCommodityFromTerrain(hex.terrain);
        if (!commodity) continue; // Skip terrains that don't produce commodities

        // Get all 6 vertices for this hex
        const [q, r] = hex.id.split(',').map(Number);

        // Check each of the 6 vertices
        for (let d = 0; d < 6; d++) {
            const vertexId = getCanonicalVertexId(q, r, d);
            const vertex = gameState.board.vertices[vertexId];

            if (!vertex || !vertex.owner) continue;

            // Only cities and metropolises produce commodities
            if (vertex.structure !== 'city' && vertex.structure !== 'metropolis') continue;

            const player = gameState.players.find(p => p.id === vertex.owner);
            if (!player) continue;

            // Initialize commodities if needed (for C&K mode)
            if (!player.commodities) {
                player.commodities = { paper: 0, cloth: 0, coin: 0 };
            }

            // Initialize tracking if needed
            if (!distribution[player.id]) {
                distribution[player.id] = {};
            }

            // Cities produce 1 commodity (metropolises also produce 1)
            const amount = 1;

            player.commodities[commodity] = (player.commodities[commodity] || 0) + amount;
            distribution[player.id][commodity] = (distribution[player.id][commodity] || 0) + amount;
        }
    }

    return distribution;
}

/**
 * Count total commodities for a player
 *
 * @param player - Player state
 * @returns Total number of commodity cards
 */
export function getTotalCommodities(player: PlayerState): number {
    if (!player.commodities) return 0;
    return Object.values(player.commodities).reduce((sum, count) => sum + count, 0);
}

/**
 * Check if player has specific commodities
 *
 * @param player - Player state
 * @param required - Required commodities
 * @returns true if player has all required commodities
 */
export function hasCommodities(
    player: PlayerState,
    required: Partial<Record<CommodityType, number>>
): boolean {
    if (!player.commodities) return false;
    return Object.entries(required).every(
        ([commodity, amount]) =>
            (player.commodities![commodity as CommodityType] || 0) >= (amount || 0)
    );
}

/**
 * Add commodities to a player
 *
 * @param player - Player receiving commodities
 * @param commodities - Commodities to add
 */
export function addCommodities(
    player: PlayerState,
    commodities: Partial<Record<CommodityType, number>>
): void {
    // Initialize commodities if needed
    if (!player.commodities) {
        player.commodities = { paper: 0, cloth: 0, coin: 0 };
    }

    Object.entries(commodities).forEach(([commodity, amount]) => {
        const com = commodity as CommodityType;
        player.commodities![com] = (player.commodities![com] || 0) + (amount || 0);
    });
}

/**
 * Remove commodities from a player
 *
 * @param player - Player losing commodities
 * @param commodities - Commodities to remove
 */
export function removeCommodities(
    player: PlayerState,
    commodities: Partial<Record<CommodityType, number>>
): void {
    if (!player.commodities) return;

    Object.entries(commodities).forEach(([commodity, amount]) => {
        const com = commodity as CommodityType;
        player.commodities![com] = Math.max(0, (player.commodities![com] || 0) - (amount || 0));
    });
}

/**
 * Get the commodity type for a specific improvement track
 * Each improvement track uses a specific commodity type
 *
 * @param improvement - Improvement type (science/trade/politics)
 * @returns Commodity type used for that improvement
 */
export function getCommodityForImprovement(improvement: 'science' | 'trade' | 'politics'): CommodityType {
    const mapping = {
        science: 'paper' as CommodityType,
        trade: 'cloth' as CommodityType,
        politics: 'coin' as CommodityType,
    };
    return mapping[improvement];
}
