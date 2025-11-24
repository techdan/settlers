import { ResourceType } from '@/lib/board-data';

/**
 * Building costs in the game
 */

export const BUILDING_COSTS = {
    road: {
        wood: 1,
        brick: 1,
    } as Record<ResourceType, number>,

    settlement: {
        wood: 1,
        brick: 1,
        sheep: 1,
        wheat: 1,
    } as Record<ResourceType, number>,

    city: {
        wheat: 2,
        ore: 3,
    } as Record<ResourceType, number>,

    devCard: {
        sheep: 1,
        wheat: 1,
        ore: 1,
    } as Record<ResourceType, number>,
} as const;

/**
 * Helper to check if player has resources for a building
 */
export function canAfford(
    playerResources: Record<ResourceType, number>,
    cost: Record<ResourceType, number>
): boolean {
    return Object.entries(cost).every(
        ([resource, amount]) =>
            (playerResources[resource as ResourceType] || 0) >= amount
    );
}

/**
 * Helper to deduct resources for a building
 */
export function deductCost(
    playerResources: Record<ResourceType, number>,
    cost: Record<ResourceType, number>
): void {
    Object.entries(cost).forEach(([resource, amount]) => {
        playerResources[resource as ResourceType] -= amount;
    });
}
