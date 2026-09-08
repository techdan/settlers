import { describe, expect, it } from 'vitest';
import { createHex } from '@/lib/hex';
import { createTestBoard, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { EMPTY_DICE_STATS, EMPTY_EVENT_DIE_STATS, type ProductionSource } from '@/lib/types/game';
import type { TerrainType } from '@/core/rules/board-constants';
import { getDiceRollKey } from '@/lib/presentation/dice-events';
import { distributeResources } from '../resource-manager';
import { distributeCommodities } from '../commodity-manager';
import { createProductionEvent } from '../production-event';

function productionFixture() {
    const terrains: TerrainType[] = ['forest', 'pasture', 'mountain', 'field', 'hill'];
    return createTestGameState({
        gameMode: 'cities_and_knights',
        diceRoll: { d1: 3, d2: 3, total: 6 },
        eventDieStats: { ...EMPTY_EVENT_DIE_STATS, ship: 1 },
        players: [createTestPlayer({ id: 'p1' }), createTestPlayer({ id: 'aqueduct', improvements: { science: 3, politics: 0, trade: 0 } })],
        pendingAqueduct: ['aqueduct'],
        board: createTestBoard({
            hexes: terrains.map((terrain, index) => ({ id: `${index * 4},0`, hex: createHex(index * 4, 0), terrain, numberToken: 6 })),
            vertices: terrains.map((_, index) => createTestVertex({ q: index * 4, r: 0, d: 0, owner: 'p1', structure: 'city' })),
        }),
    });
}

describe('resolved production metadata', () => {
    it('records all eight exact C&K award types at the actual hex awards', () => {
        const game = productionFixture();
        const sources: ProductionSource[] = [];
        const resources = distributeResources(game, 6, sources);
        const commodities = distributeCommodities(game, 6, sources);
        const event = createProductionEvent(game, 6, resources, commodities, sources);
        expect(event.id).toBe(getDiceRollKey(game));
        expect(event.gains).toEqual([{
            playerId: 'p1',
            resources: { wood: 1, sheep: 1, ore: 1, wheat: 2, brick: 2 },
            commodities: { paper: 1, cloth: 1, coin: 1 },
        }]);
        expect(event.sources).toHaveLength(8);
        expect(event.sources).toContainEqual({ hexId: '0,0', playerId: 'p1', kind: 'resource', type: 'wood', amount: 1 });
        expect(event.sources).toContainEqual({ hexId: '0,0', playerId: 'p1', kind: 'commodity', type: 'paper', amount: 1 });
        expect(event.gains.some(gain => gain.playerId === 'aqueduct')).toBe(false);
    });

    it('omits robber-blocked resource and commodity awards and records an empty seven', () => {
        const game = productionFixture();
        game.robberHexId = '0,0';
        const sources: ProductionSource[] = [];
        const resources = distributeResources(game, 6, sources);
        const commodities = distributeCommodities(game, 6, sources);
        const event = createProductionEvent(game, 6, resources, commodities, sources);
        expect(event.sources.some(source => source.hexId === '0,0')).toBe(false);
        expect(event.gains[0].resources.wood).toBeUndefined();
        expect(event.gains[0].commodities.paper).toBeUndefined();
        const sevenSources: ProductionSource[] = [];
        game.diceRoll = { d1: 3, d2: 4, total: 7 };
        game.eventDieStats!.ship++;
        const seven = createProductionEvent(game, 7, distributeResources(game, 7, sevenSources), distributeCommodities(game, 7, sevenSources), sevenSources);
        expect(seven.gains).toEqual([]);
        expect(seven.sources).toEqual([]);
        expect(seven.id).not.toBe(event.id);
    });

    it('records base city yields and distinct identities for repeated identical dice', () => {
        const game = productionFixture();
        game.gameMode = 'base';
        game.diceStats = { ...EMPTY_DICE_STATS, 6: 1 };
        const sources: ProductionSource[] = [];
        const resources = distributeResources(game, 6, sources);
        const event = createProductionEvent(game, 6, resources, distributeCommodities(game, 6, sources), sources);
        expect(event.gains[0].resources.wood).toBe(2);
        expect(event.gains[0].commodities).toEqual({});
        game.diceStats[6]++;
        expect(createProductionEvent(game, 6, resources, {}, sources).id).not.toBe(event.id);
        resources.p1.wood = 100;
        sources[0].amount = 100;
        expect(event.gains[0].resources.wood).toBe(2);
        expect(event.sources[0].amount).toBe(2);
    });
});
