import { describe, expect, it } from 'vitest';
import {
    calculatePublicVictoryPoints,
    calculateTotalVictoryPoints,
    checkVictoryCondition,
    updateAllVictoryPoints,
} from '../victory-conditions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';

describe('Victory Conditions', () => {
    it('calculates total victory points including Cities & Knights bonuses', () => {
        const player = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 4, // 1 settlement built
            citiesRemaining: 2, // 2 cities built
            revealedVPCards: ['printer'],
            defenderVPTokens: 1,
            metropolisOwned: ['science'],
        });
        player.devCards.victory_point = 1;

        const gameState = createTestGameState({
            players: [player],
            longestRoadOwner: 'p1',
            activeMerchant: 'p1',
            gameMode: 'cities_and_knights',
        });

        updateAllVictoryPoints(gameState);

        // 1 settlement (1) + 2 cities (4) + 1 VP dev card (1)
        // + longest road (2) + metropolis bonus (2) + merchant (1)
        // + defender token (1) + revealed VP card (1) = 13
        expect(player.victoryPoints).toBe(13);
    });

    it('omits hidden dev cards in public victory points', () => {
        const player = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 4,
            citiesRemaining: 3, // 1 city built
            revealedVPCards: ['printer'],
            defenderVPTokens: 0,
        });
        player.devCards.victory_point = 2;

        const gameState = createTestGameState({
            players: [player],
            gameMode: 'cities_and_knights',
        });

        updateAllVictoryPoints(gameState);

        expect(player.victoryPoints).toBe(6); // 1 settlement + 1 city + 2 dev + revealed VP
        expect(calculatePublicVictoryPoints(gameState, 'p1')).toBe(4); // Hidden dev cards excluded
    });

    it('counts largest army only in base game', () => {
        const basePlayer = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 3, // 2 settlements
            citiesRemaining: 3, // 1 city
        });
        basePlayer.devCards.victory_point = 1;

        const baseGame = createTestGameState({
            players: [basePlayer],
            gameMode: 'base',
            longestRoadOwner: 'p1',
            largestArmyOwner: 'p1',
        });

        updateAllVictoryPoints(baseGame);
        expect(basePlayer.victoryPoints).toBe(9); // includes largest army

        const ckPlayer = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 3,
            citiesRemaining: 3,
        });
        ckPlayer.devCards.victory_point = 1;

        const ckGame = createTestGameState({
            players: [ckPlayer],
            gameMode: 'cities_and_knights',
            longestRoadOwner: 'p1',
            largestArmyOwner: 'p1',
        });

        updateAllVictoryPoints(ckGame);
        expect(ckPlayer.victoryPoints).toBe(7); // largest army excluded in C&K
    });

    it('returns winner when reaching threshold for base game', () => {
        const player = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 1, // 4 settlements built
            citiesRemaining: 2, // 2 cities built
        });
        const gameState = createTestGameState({
            players: [player],
            gameMode: 'base',
            longestRoadOwner: 'p1',
        });

        updateAllVictoryPoints(gameState);
        expect(player.victoryPoints).toBe(10);
        expect(checkVictoryCondition(gameState)).toBe('p1');
    });

    it('returns null when no player meets Cities & Knights threshold', () => {
        const player = createTestPlayer({
            id: 'p1',
            settlementsRemaining: 3, // 2 settlements
            citiesRemaining: 3, // 1 city
        });
        const gameState = createTestGameState({
            players: [player],
            gameMode: 'cities_and_knights',
        });

        updateAllVictoryPoints(gameState);
        expect(player.victoryPoints).toBeLessThan(13);
        expect(checkVictoryCondition(gameState)).toBeNull();
        expect(calculateTotalVictoryPoints(gameState, 'p1')).toBe(player.victoryPoints);
    });
});
