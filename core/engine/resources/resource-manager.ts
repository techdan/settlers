import { GameState, PlayerState } from '@/lib/types';
import { TerrainType } from '@/core/engine/board/board-generator';
import { ResourceType } from '@/core/rules/board-constants';
import { getCanonicalVertexId } from '@/lib/hex';
import { getResourceFromTerrain } from '@/core/rules/game-rules';
import { CommodityType, TERRAIN_TO_COMMODITY } from '@/core/rules/commodity-constants';

export type ResourceDistribution = Record<string, Partial<Record<ResourceType, number>>>;
export type CommodityDistribution = Record<string, Partial<Record<CommodityType, number>>>;

/**
 * Resource Manager
 * Handles resource distribution and calculations
 */

/**
 * Distribute resources for a dice roll
 * 
 * @param gameState - Current game state
 * @param diceTotal - Total of dice roll
 * @returns Updated game state (mutated)
 */
export function distributeResources(gameState: GameState, diceTotal: number): ResourceDistribution {
    // Skip if robber roll (7)
    if (diceTotal === 7) return {};

    // Find all hexes with this number
    const matchingHexes = gameState.board.hexes.filter(
        hex => hex.numberToken === diceTotal && hex.id !== gameState.robberHexId
    );

    // Track resources given to each player
    const distribution: ResourceDistribution = {};
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';

    // For each matching hex, give resources to adjacent settlements/cities
    for (const hex of matchingHexes) {
        // Get resource from terrain using game rules
        const resource = getResourceFromTerrain(hex.terrain);
        if (!resource) continue; // Skip desert (produces no resources)

        // Get all 6 vertices for this hex
        const [q, r] = hex.id.split(',').map(Number);

        // Check each of the 6 vertices
        for (let d = 0; d < 6; d++) {
            const vertexId = getCanonicalVertexId(q, r, d);
            const vertex = gameState.board.vertices[vertexId];

            if (!vertex || !vertex.owner) continue;

            const player = gameState.players.find(p => p.id === vertex.owner);
            if (!player) continue;

            // Initialize tracking if needed
            if (!distribution[player.id]) {
                distribution[player.id] = {};
            }

            // Give resources based on structure type
            let amount = 0;
            if (vertex.structure === 'settlement') {
                amount = 1;
            } else if (vertex.structure === 'city' || vertex.structure === 'metropolis') {
                // In C&K, cities on commodity-producing hexes yield 1 resource (plus 1 commodity elsewhere)
                const isCommodityHex = isCitiesAndKnights && !!TERRAIN_TO_COMMODITY[hex.terrain as TerrainType];
                amount = isCommodityHex ? 1 : 2;
            }

            if (amount > 0) {
                player.resources[resource] = (player.resources[resource] || 0) + amount;
                distribution[player.id][resource] = (distribution[player.id][resource] || 0) + amount;
            }
        }
    }

    return distribution;
}

/**
 * Count total resources for a player
 * 
 * @param player - Player state
 * @returns Total number of resource cards
 */
export function getTotalResources(player: PlayerState): number {
    return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
}

/**
 * Check if player has specific resources
 * 
 * @param player - Player state
 * @param required - Required resources
 * @returns true if player has all required resources
 */
export function hasResources(
    player: PlayerState,
    required: Partial<Record<ResourceType, number>>
): boolean {
    return Object.entries(required).every(
        ([resource, amount]) =>
            (player.resources[resource as ResourceType] || 0) >= (amount || 0)
    );
}

/**
 * Transfer resources from one player to another
 * 
 * @param from - Player giving resources
 * @param to - Player receiving resources
 * @param resources - Resources to transfer
 */
export function transferResources(
    from: PlayerState,
    to: PlayerState,
    resources: Partial<Record<ResourceType, number>>
): void {
    Object.entries(resources).forEach(([resource, amount]) => {
        const res = resource as ResourceType;
        const amt = amount || 0;

        from.resources[res] = (from.resources[res] || 0) - amt;
        to.resources[res] = (to.resources[res] || 0) + amt;
    });
}

/**
 * Add resources to a player
 * 
 * @param player - Player receiving resources
 * @param resources - Resources to add
 */
export function addResources(
    player: PlayerState,
    resources: Partial<Record<ResourceType, number>>
): void {
    Object.entries(resources).forEach(([resource, amount]) => {
        const res = resource as ResourceType;
        player.resources[res] = (player.resources[res] || 0) + (amount || 0);
    });
}

/**
 * Remove resources from a player
 * 
 * @param player - Player losing resources
 * @param resources - Resources to remove
 */
export function removeResources(
    player: PlayerState,
    resources: Partial<Record<ResourceType, number>>
): void {
    Object.entries(resources).forEach(([resource, amount]) => {
        const res = resource as ResourceType;
        player.resources[res] = Math.max(0, (player.resources[res] || 0) - (amount || 0));
    });
}

/**
 * Steal a random resource from a player
 * 
 * @param victim - Player to steal from
 * @returns Stolen resource type, or null if victim has no resources
 */
export function stealRandomResource(victim: PlayerState): ResourceType | null {
    const availableResources: ResourceType[] = [];

    Object.entries(victim.resources).forEach(([resource, count]) => {
        for (let i = 0; i < count; i++) {
            availableResources.push(resource as ResourceType);
        }
    });

    if (availableResources.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableResources.length);
    const stolenResource = availableResources[randomIndex];

    victim.resources[stolenResource]--;

    return stolenResource;
}

/**
 * Log combined resource and commodity distribution per player
 * Ensures a single log entry per player for a dice roll.
 */
export function logDistribution(
    gameState: GameState,
    resourceDistribution: ResourceDistribution = {},
    commodityDistribution: CommodityDistribution = {}
): void {
    const playerIds = new Set<string>([
        ...Object.keys(resourceDistribution),
        ...Object.keys(commodityDistribution),
    ]);

    playerIds.forEach(playerId => {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;

        const parts: string[] = [];

        Object.entries(resourceDistribution[playerId] || {}).forEach(([res, count]) => {
            if (count) parts.push(`${count} ${res}`);
        });

        Object.entries(commodityDistribution[playerId] || {}).forEach(([com, count]) => {
            if (count) parts.push(`${count} ${com}`);
        });

        if (parts.length > 0) {
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${player.name} received ${parts.join(', ')}`,
                playerId
            });
        }
    });
}
