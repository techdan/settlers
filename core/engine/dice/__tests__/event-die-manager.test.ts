import { describe, expect, it, beforeEach } from 'vitest';
import {
    rollEventDie,
    processEventDieRoll,
    getCategoryFromColor,
    getEligiblePlayersForCardDraw
} from '../event-die-manager';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import { EVENT_DIE_FACES } from '@/lib/types/game';

describe('Event Die Manager', () => {
    describe('rollEventDie', () => {
        it('returns a valid event die face', () => {
            const result = rollEventDie();
            expect(EVENT_DIE_FACES).toContain(result);
        });
    });

    describe('processEventDieRoll', () => {
        let gameState: GameState;

        beforeEach(() => {
            gameState = createTestGameState({
                players: [
                    createTestPlayer({
                        id: 'p1',
                        name: 'Player 1',
                        improvements: { science: 3, trade: 0, politics: 0 }
                    }),
                    createTestPlayer({
                        id: 'p2',
                        name: 'Player 2',
                        improvements: { science: 1, trade: 0, politics: 0 }
                    }),
                ],
                gameMode: 'cities_and_knights'
            });
            gameState.barbarianPosition = 0;
            gameState.hasBarbariansAttacked = false;
        });

        it('ignores standard game mode', () => {
            gameState.gameMode = 'base';
            processEventDieRoll(gameState, 'ship', 3);
            // If stats are initialized by default, check they don't change
            if (!gameState.eventDieStats) {
                expect(gameState.eventDieStats).toBeUndefined();
            } else {
                const initialShip = gameState.eventDieStats.ship;
                processEventDieRoll(gameState, 'ship', 3);
                expect(gameState.eventDieStats.ship).toBe(initialShip);
            }
        });

        it('advances barbarian on ship result', () => {
            processEventDieRoll(gameState, 'ship', 3);

            expect(gameState.barbarianPosition).toBe(1);
            expect(gameState.logs.length).toBeGreaterThan(0);
            expect(gameState.logs[gameState.logs.length - 1].message).toContain('Barbarian ship advances');
            expect(gameState.eventDieStats?.ship).toBe(1);
        });

        it('triggers barbarian attack when reaching 7', () => {
            gameState.barbarianPosition = 6;

            processEventDieRoll(gameState, 'ship', 3);

            expect(gameState.barbarianPosition).toBe(0);
            expect(gameState.hasBarbariansAttacked).toBe(true);
            expect(gameState.logs.some(log => log.message.includes('Barbarian'))).toBe(true);
        });

        it('identifies eligible players for progress cards', () => {
            // Roll 'science', red die 3
            // p1: science 3. Threshold: 3+1=4 >= 3. Eligible?
            // Rule: Red Die <= (Level + 1)
            // p1: Level 3. Limit 4. Red 3 <= 4. Eligible.
            // p2: Level 1. Limit 2. Red 3 > 2. Not eligible.

            processEventDieRoll(gameState, 'science', 3);

            const log = gameState.logs.find(l => l.message.includes('Player 1 may draw'));
            expect(log).toBeDefined();
            expect(log?.message).not.toContain('Player 2');
        });

        it('logs when no one is eligible', () => {
            // Roll 'science', red die 6
            // p1: Level 3 -> Limit 4. 6 > 4. No.

            processEventDieRoll(gameState, 'science', 6);

            const log = gameState.logs.find(l => l.message.includes('No players qualify'));
            expect(log).toBeDefined();
        });
    });

    describe('getCategoryFromColor', () => {
        it('returns correct categories', () => {
            expect(getCategoryFromColor('science')).toBe('science');
            expect(getCategoryFromColor('trade')).toBe('trade');
            expect(getCategoryFromColor('politics')).toBe('politics');
        });
    });

    describe('getEligiblePlayersForCardDraw', () => {
        let gameState: GameState;
        beforeEach(() => {
            gameState = createTestGameState({
                players: [
                    createTestPlayer({
                        id: 'p1',
                        improvements: { science: 3, trade: 0, politics: 0 }
                    }),
                    createTestPlayer({
                        id: 'p2',
                        improvements: { science: 1, trade: 0, politics: 0 }
                    }),
                ],
                gameMode: 'cities_and_knights'
            });
        });

        it('returns list of eligible player IDs', () => {
            // Science (green), red die 3
            // p1 eligible, p2 not
            const eligible = getEligiblePlayersForCardDraw(gameState, 'science', 3);
            expect(eligible).toContain('p1');
            expect(eligible).not.toContain('p2');
        });
    });
});
