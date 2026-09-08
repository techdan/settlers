import type { GameState, ProductionEvent, ProductionSource } from '@/lib/types/game';
import { getResolvedDiceRollId } from '@/core/engine/dice/dice-event-identity';
import type { ResourceDistribution } from './resource-manager';
import type { CommodityDistribution } from './commodity-manager';

/** Capture only the returned award maps and entries emitted at actual awards. */
export function createProductionEvent(
    game: GameState,
    diceTotal: number,
    resources: ResourceDistribution = {},
    commodities: CommodityDistribution = {},
    sources: readonly ProductionSource[] = [],
): ProductionEvent {
    const playerIds = new Set([...Object.keys(resources), ...Object.keys(commodities)]);
    return {
        id: getResolvedDiceRollId(game) ?? `${game.id}:production:${globalThis.crypto.randomUUID()}`,
        timestamp: Date.now(),
        diceTotal,
        gains: [...playerIds].map(playerId => ({
            playerId,
            resources: { ...resources[playerId] },
            commodities: { ...commodities[playerId] },
        })).filter(gain => Object.values(gain.resources).some(amount => amount > 0)
            || Object.values(gain.commodities).some(amount => amount > 0)),
        sources: sources.map(source => ({ ...source })),
    };
}
