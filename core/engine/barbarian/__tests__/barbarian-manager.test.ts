import { describe, expect, it, beforeEach } from 'vitest';
import {
    resolveBarbbarianAttack,
    getTotalCities,
} from '../barbarian-manager';
import { createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import type { GameState } from '@/lib/types';

describe('Barbarian Manager', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    knights: [],
                    defenderVPTokens: 0
                }),
                createTestPlayer({
                    id: 'p2',
                    name: 'Player 2',
                    knights: [],
                    defenderVPTokens: 0
                }),
            ],
            gameMode: 'cities_and_knights'
        });
        gameState.barbarianPosition = 7;
    });

    describe('getTotalCities', () => {
        it('counts cities and metropolises', () => {
            // Create 1 city for p1, 1 metropolis for p2
            gameState.board.vertices['0,0,0'] = { id: '0,0,0', owner: 'p1', structure: 'city', q: 0, r: 0, d: 0 };
            gameState.board.vertices['0,1,0'] = { id: '0,1,0', owner: 'p2', structure: 'metropolis', q: 0, r: 1, d: 0 };
            gameState.board.vertices['0,2,0'] = { id: '0,2,0', owner: 'p1', structure: 'settlement', q: 0, r: 2, d: 0 };

            expect(getTotalCities(gameState)).toBe(2);
        });
    });

    describe('resolveBarbbarianAttack - Defenders Win', () => {
        it('awards VP token to single strongest defender', () => {
            // Setup: 1 city total. Knights: p1=2, p2=0. Total strength 2 >= 1.
            gameState.board.vertices['0,0,0'] = { id: '0,0,0', owner: 'p1', structure: 'city', q: 0, r: 0, d: 0 };

            // p1 has active strong knight (strength 2)
            gameState.players[0].knights = [{
                id: 'k1',
                level: 'strong',
                active: true,
                playerId: 'p1',
                vertexId: '0,0,0',
            }];
            gameState.players[0].activeKnightCount = 2; // Usually calculated, but setting for safety if mocked

            resolveBarbbarianAttack(gameState);

            expect(gameState.players[0].defenderVPTokens).toBe(1);
            const defenderLog = gameState.logs.find(l => l.message.includes('Defender of Catan'));
            expect(defenderLog).toBeDefined();
            expect(gameState.barbarianPosition).toBe(0);

            // Knights deactivated
            expect(gameState.players[0].knights![0].active).toBe(false);
        });

        it('awards progress cards on tie (no VP token)', () => {
            // Setup: 1 city total. Knights: p1=1, p2=1. Total 2 >= 1.
            gameState.board.vertices['0,0,0'] = { id: '0,0,0', owner: 'p1', structure: 'city', q: 0, r: 0, d: 0 };

            gameState.players[0].knights = [{
                id: 'k1',
                level: 'basic',
                active: true,
                playerId: 'p1',
                vertexId: 'e1',
            }];
            gameState.players[1].knights = [{
                id: 'k2',
                level: 'basic',
                active: true,
                playerId: 'p2',
                vertexId: 'e2',
            }];

            resolveBarbbarianAttack(gameState);

            expect(gameState.players[0].defenderVPTokens).toBe(0);
            expect(gameState.pendingDefenderCardDraws).toEqual(expect.arrayContaining(['p1', 'p2']));
            expect(gameState.barbarianPosition).toBe(0);
        });
    });

    describe('resolveBarbbarianAttack - Attackers Win', () => {
        beforeEach(() => {
            // 3 Cities total. p1: 2 cities, p2: 1 city
            // Knights: p1=1, p2=0. Total 1 < 3.
            gameState.board.vertices['v1'] = createTestVertex({ id: 'v1', owner: 'p1', structure: 'city', q: 0, r: 0, d: 0 });
            gameState.board.vertices['v2'] = createTestVertex({ id: 'v2', owner: 'p1', structure: 'city', q: 0, r: 1, d: 0 });
            gameState.board.vertices['v3'] = createTestVertex({ id: 'v3', owner: 'p2', structure: 'city', q: 1, r: 0, d: 0 });
        });

        it('weakest player loses city (p2 has 0 knights)', () => {
            gameState.players[0].knights = [{
                id: 'k1',
                level: 'basic',
                active: true,
                playerId: 'p1',
                vertexId: 'e1',
            }];
            // p2 has 0 knights

            resolveBarbbarianAttack(gameState);

            // p2 should be victim
            expect(gameState.pendingBarbarianVictims).toEqual(['p2']);
            expect(gameState.phase).toBe('barbarian_city_selection');
        });

        it('cascades if weakest has no destroyable cities (only metropolis)', () => {
            // p2 has 0 knights but only a Metropolis.
            // p1 has 1 knight and Cities.
            // Weakest group (0 strength) = [p2]. 
            // p2 checked: has city? No (Metropolis).
            // Cascade to next group (1 strength) = [p1].
            // p1 has 2 cities. p1 becomes victim.

            gameState.board.vertices['v3'].structure = 'metropolis'; // p2's city is now metropolis
            gameState.players[0].knights = [{
                id: 'k1',
                level: 'basic',
                active: true,
                playerId: 'p1',
                vertexId: 'e1',
            }];

            resolveBarbbarianAttack(gameState);

            expect(gameState.pendingBarbarianVictims).toEqual(['p1']);
        });
    });
});
