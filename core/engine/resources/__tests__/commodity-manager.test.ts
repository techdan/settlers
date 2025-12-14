import { describe, expect, it, beforeEach } from 'vitest';
import {
    distributeCommodities,
    getTotalCommodities,
    hasCommodities,
    addCommodities,
    removeCommodities,
    getCommodityForImprovement
} from '../commodity-manager';
import { createTestGameState, createTestPlayer, createTestBoard, createTestVertex } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

type Hex = any;

describe('Commodity Manager', () => {
    let gameState: GameState;

    const createHex = (id: string, numberToken: number, terrain: string): Hex => {
        const [q, r] = id.split(',').map(Number);
        return {
            id, q, r,
            terrain: terrain as any,
            numberToken,
            vertices: [], edges: [],
            resource: terrain === 'desert' ? null : 'wood'
        };
    };

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    commodities: { paper: 0, cloth: 0, coin: 0 }
                }),
                createTestPlayer({
                    id: 'p2',
                    name: 'Player 2',
                    commodities: { paper: 0, cloth: 0, coin: 0 }
                }),
            ],
            gameMode: 'cities_and_knights',
            board: createTestBoard({
                hexes: [
                    createHex('0,0', 6, 'forest'), // Produces Paper
                    createHex('1,0', 5, 'pasture'), // Produces Cloth
                    createHex('-1,0', 4, 'mountain') // Produces Coin (singular 'mountain')
                ],
                vertices: [
                    // p1 city on Forest (0,0,0)
                    createTestVertex({ q: 0, r: 0, d: 0, owner: 'p1', structure: 'city' }),
                    // p1 settlement on Pasture (1,0,0)
                    createTestVertex({ q: 1, r: 0, d: 0, owner: 'p1', structure: 'settlement' }),
                    // p2 metropolis on Mountains (-1,0,0)
                    createTestVertex({ q: -1, r: 0, d: 0, owner: 'p2', structure: 'metropolis' })
                ],
                edges: []
            })
        });
    });

    describe('distributeCommodities', () => {
        it('distributes paper for city on forest', () => {
            // Roll 6 -> Forest
            const distribution = distributeCommodities(gameState, 6);

            expect(gameState.players[0].commodities!.paper).toBe(1);
            expect(distribution['p1']?.paper).toBe(1);
        });

        it('does NOT distribute commodity for settlement', () => {
            // Roll 5 -> Pasture (Cloth)
            // p1 has settlement there

            // Downgrade interfering city at 0,0,0 to prevent it from producing
            Object.values(gameState.board.vertices).forEach(v => {
                if (v.q === 0 && v.r === 0 && v.d === 0) v.structure = 'settlement';
            });

            distributeCommodities(gameState, 5);
            expect(gameState.players[0].commodities!.cloth).toBe(0);
        });

        it('distributes coin for metropolis on mountains', () => {
            // Roll 4 -> Mountains
            // p2 has metropolis

            distributeCommodities(gameState, 4);
            expect(gameState.players[1].commodities!.coin).toBe(1);
        });

        it('gives nothing in standard mode', () => {
            gameState.gameMode = 'base';
            distributeCommodities(gameState, 6);
            expect(gameState.players[0].commodities!.paper).toBe(0);
        });

        it('gives nothing on 7', () => {
            distributeCommodities(gameState, 7);
            expect(gameState.players[0].commodities!.paper).toBe(0);
        });
    });

    describe('Commodity Helpers', () => {
        it('counts total commodities', () => {
            gameState.players[0].commodities = { paper: 1, cloth: 2, coin: 0 };
            expect(getTotalCommodities(gameState.players[0])).toBe(3);
        });

        it('checks hasCommodities', () => {
            gameState.players[0].commodities = { paper: 1, cloth: 2, coin: 0 };
            expect(hasCommodities(gameState.players[0], { paper: 1, cloth: 1 })).toBe(true);
            expect(hasCommodities(gameState.players[0], { coin: 1 })).toBe(false);
        });

        it('adds commodities', () => {
            addCommodities(gameState.players[0], { paper: 1 });
            expect(gameState.players[0].commodities!.paper).toBe(1);
        });

        it('removes commodities', () => {
            gameState.players[0].commodities = { paper: 2, cloth: 0, coin: 0 };
            removeCommodities(gameState.players[0], { paper: 1 });
            expect(gameState.players[0].commodities!.paper).toBe(1);
        });
    });

    describe('getCommodityForImprovement', () => {
        it('returns correct mappings', () => {
            expect(getCommodityForImprovement('science')).toBe('paper');
            expect(getCommodityForImprovement('trade')).toBe('cloth');
            expect(getCommodityForImprovement('politics')).toBe('coin');
        });
    });
});
