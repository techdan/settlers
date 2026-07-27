import { describe, expect, it, beforeEach } from 'vitest';
import {
    getUpgradeCost,
    upgradeImprovement,
    canDrawProgressCard,
    tryAwardMetropolis,
    tryStealMetropolis
} from '../improvement-manager';
import { createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import type { GameState } from '@/lib/types';

describe('Improvement Manager', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    commodities: { paper: 0, cloth: 0, coin: 0 },
                    improvements: { science: 0, trade: 0, politics: 0 }
                }),
                createTestPlayer({
                    id: 'p2',
                    name: 'Player 2',
                    commodities: { paper: 0, cloth: 0, coin: 0 },
                    improvements: { science: 0, trade: 0, politics: 0 }
                }),
            ],
            gameMode: 'cities_and_knights'
        });
    });

    describe('getUpgradeCost', () => {
        it('returns correct costs per level', () => {
            expect(getUpgradeCost(0)).toBe(1); // 0->1
            expect(getUpgradeCost(1)).toBe(2); // 1->2
            expect(getUpgradeCost(2)).toBe(3); // 2->3
            expect(getUpgradeCost(3)).toBe(4); // 3->4
            expect(getUpgradeCost(4)).toBe(5); // 4->5
        });

        it('returns 0 for max level', () => {
            expect(getUpgradeCost(5)).toBe(0);
        });

        it('applies discount', () => {
            expect(getUpgradeCost(1, 1)).toBe(1); // 2 - 1 = 1
            expect(getUpgradeCost(0, 1)).toBe(0); // 1 - 1 = 0
        });
    });

    describe('upgradeImprovement', () => {
        it('upgrades science using paper', () => {
            const player = gameState.players[0];
            player.commodities!.paper = 1;

            const newLevel = upgradeImprovement(player, 'science');

            expect(newLevel).toBe(1);
            expect(player.improvements!.science).toBe(1);
            expect(player.commodities!.paper).toBe(0);
        });

        it('fails if insufficient commodities', () => {
            const player = gameState.players[0];
            player.commodities!.paper = 0;

            const result = upgradeImprovement(player, 'science');

            expect(result).toBe(-1);
            expect(player.improvements!.science).toBe(0);
        });
    });

    describe('canDrawProgressCard', () => {
        it('allows draw if red die <= level + 1', () => {
            const player = gameState.players[0];
            player.improvements!.science = 3;
            // Threshold: 3+1 = 4.

            expect(canDrawProgressCard(player, 'science', 1)).toBe(true);
            expect(canDrawProgressCard(player, 'science', 4)).toBe(true);
            expect(canDrawProgressCard(player, 'science', 5)).toBe(false);
        });

        it('never allows draw at level 0', () => {
            const player = gameState.players[0];
            player.improvements!.science = 0;
            expect(canDrawProgressCard(player, 'science', 1)).toBe(false);
        });
    });

    describe('tryAwardMetropolis', () => {
        it('awards metropolis at level 4 if unclaimed', () => {
            const player = gameState.players[0];
            player.improvements!.science = 4;

            // Give player a city (required to upgrade to metropolis)
            gameState.board.vertices['city1'] = createTestVertex({
                id: 'city1', owner: 'p1', structure: 'city'
            });

            const awarded = tryAwardMetropolis(gameState, player, 'science');

            expect(awarded).toBe(true);
            expect(player.metropolisOwned).toContain('science');
            expect(gameState.metropolises?.science?.owner).toBe('p1');
            expect(gameState.board.vertices['city1'].structure).toBe('metropolis');
        });

        it('fails if player has no city', () => {
            const player = gameState.players[0];
            player.improvements!.science = 4;
            // No city on board

            const awarded = tryAwardMetropolis(gameState, player, 'science');
            expect(awarded).toBe(false);
        });
    });

    describe('tryStealMetropolis', () => {
        it('steals metropolis at level 5 from level 4 owner', () => {
            // Setup p2 owning metropolis at level 4
            const p2 = gameState.players[1];
            p2.improvements!.science = 4;
            p2.metropolisOwned = ['science'];

            gameState.board.vertices['p2city'] = createTestVertex({
                id: 'p2city', owner: 'p2', structure: 'metropolis'
            });
            gameState.metropolises = {
                science: { type: 'science', owner: 'p2', vertexId: 'p2city' }
            };

            // Setup p1 reaching level 5
            const p1 = gameState.players[0];
            p1.improvements!.science = 5;
            gameState.board.vertices['p1city'] = createTestVertex({
                id: 'p1city', owner: 'p1', structure: 'city'
            });

            const stolen = tryStealMetropolis(gameState, p1, 'science');

            expect(stolen).toBe(true);
            expect(p1.metropolisOwned).toContain('science');
            expect(p2.metropolisOwned).not.toContain('science');

            // Vertices update
            expect(gameState.board.vertices['p1city'].structure).toBe('metropolis');
            expect(gameState.board.vertices['p2city'].structure).toBe('city');
        });

        it('cannot steal if current owner is also level 5', () => {
            // Setup p2 owning metropolis at level 5
            const p2 = gameState.players[1];
            p2.improvements!.science = 5;
            p2.metropolisOwned = ['science'];

            gameState.board.vertices['p2city'] = createTestVertex({
                id: 'p2city', owner: 'p2', structure: 'metropolis'
            });
            gameState.metropolises = {
                science: { type: 'science', owner: 'p2', vertexId: 'p2city' }
            };

            // Setup p1 reaching level 5
            const p1 = gameState.players[0];
            p1.improvements!.science = 5;
            gameState.board.vertices['p1city'] = createTestVertex({
                id: 'p1city', owner: 'p1', structure: 'city'
            });

            const stolen = tryStealMetropolis(gameState, p1, 'science');

            expect(stolen).toBe(false);
            expect(p2.metropolisOwned).toContain('science');
        });
    });
});
