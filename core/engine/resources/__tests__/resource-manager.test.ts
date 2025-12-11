import { describe, expect, it, beforeEach } from 'vitest';
import {
    distributeResources,
    getTotalResources,
    hasResources,
    transferResources,
    addResources,
    removeResources,
    stealRandomResource,
    logDistribution
} from '../resource-manager';
import { createTestGameState, createTestPlayer, createTestBoard, createTestVertex } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
// Note: Hex is not exported from types/board, so we use any or define a local shape
type Hex = any;

describe('Resource Manager', () => {
    let gameState: GameState;

    // Helper to create a hex
    // Core Hex type: { id, q, r, terrain, numberToken, ... }
    const createHex = (id: string, numberToken: number, terrain: string): Hex => {
        const [q, r] = id.split(',').map(Number);
        return {
            id, q, r,
            terrain: terrain as any,
            numberToken,
            vertices: [], edges: [],
            resource: terrain === 'desert' ? null : 'wood' // simplified
        };
    };

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Player 1', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
                createTestPlayer({ id: 'p2', name: 'Player 2', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
            ],
            gameMode: 'base',
            board: createTestBoard({
                // Hex at 0,0 with number 6, Forest (produces wood)
                hexes: [
                    createHex('0,0', 6, 'forest')
                ],
                vertices: [
                    // p1 settlement at 0,0,0
                    createTestVertex({ q: 0, r: 0, d: 0, owner: 'p1', structure: 'settlement' }),
                    // p2 city at 0,0,1
                    createTestVertex({ q: 0, r: 0, d: 1, owner: 'p2', structure: 'city' }),
                ],
                edges: []
            })
        });
    });

    describe('distributeResources', () => {
        it('distributes resources for standard game mode', () => {
            // Roll 6
            const distribution = distributeResources(gameState, 6);

            // p1 settlement -> 1 wood
            // p2 city -> 2 wood

            expect(gameState.players[0].resources.wood).toBe(1);
            expect(gameState.players[1].resources.wood).toBe(2);

            expect(distribution['p1']?.wood).toBe(1);
            expect(distribution['p2']?.wood).toBe(2);
        });

        it('gives nothing for roll 7', () => {
            distributeResources(gameState, 7);
            expect(gameState.players[0].resources.wood).toBe(0);
        });

        it('handles C&K rules for commodity hexes', () => {
            gameState.gameMode = 'cities_and_knights';
            // Forest produces commodity 'paper' in C&K IF it's a city.
            // Rule: City on commodity hex produces 1 resource + 1 commodity (commodity handled separately in distributeCommodities usually?)
            // Wait, let's check code for distributeResources line 65:
            // "In C&K, cities on commodity-producing hexes yield 1 resource (plus 1 commodity elsewhere)"
            // So resource manager should give 1 resource for city, not 2.

            const distribution = distributeResources(gameState, 6);

            // p1 settlement -> 1 wood (unchanged)
            // p2 city -> 1 wood (C&K rule for commodity hex)

            expect(gameState.players[0].resources.wood).toBe(1);
            expect(gameState.players[1].resources.wood).toBe(1);
        });

        it('handles C&K rules for non-commodity hexes', () => {
            gameState.gameMode = 'cities_and_knights';
            const hex = gameState.board.hexes[0];
            hex.terrain = 'field'; // wheat (singular)

            distributeResources(gameState, 6);

            // p1 settlement -> 1 wheat
            // p2 city -> 2 wheat (because fields don't produce commodities, so city gives 2 resources)

            expect(gameState.players[0].resources.wheat).toBe(1);
            expect(gameState.players[1].resources.wheat).toBe(2);
        });
    });

    describe('Resource Helpers', () => {
        it('counts total resources', () => {
            gameState.players[0].resources = { wood: 1, brick: 2, sheep: 0, wheat: 0, ore: 0 };
            expect(getTotalResources(gameState.players[0])).toBe(3);
        });

        it('checks hasResources', () => {
            gameState.players[0].resources = { wood: 1, brick: 2, sheep: 0, wheat: 0, ore: 0 };
            expect(hasResources(gameState.players[0], { wood: 1, brick: 1 })).toBe(true);
            expect(hasResources(gameState.players[0], { wood: 2 })).toBe(false);
        });

        it('transfers resources', () => {
            gameState.players[0].resources.wood = 2;
            transferResources(gameState.players[0], gameState.players[1], { wood: 1 });

            expect(gameState.players[0].resources.wood).toBe(1);
            expect(gameState.players[1].resources.wood).toBe(1);
        });

        it('steals random resource', () => {
            gameState.players[0].resources = { wood: 10, brick: 0, sheep: 0, wheat: 0, ore: 0 };
            const stolen = stealRandomResource(gameState.players[0]);
            expect(stolen).toBe('wood');
            expect(gameState.players[0].resources.wood).toBe(9);
        });

        it('returns null if stealing from empty hand', () => {
            const stolen = stealRandomResource(gameState.players[0]);
            expect(stolen).toBeNull();
        });
    });

    describe('logDistribution', () => {
        it('logs distribution message', () => {
            logDistribution(gameState, { 'p1': { wood: 1 } });
            expect(gameState.logs.length).toBe(1);
            expect(gameState.logs[0].message).toContain('received 1 wood');
        });
    });
});
