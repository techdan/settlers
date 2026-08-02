import { describe, expect, it, beforeEach } from 'vitest';
import {
    initializeMetropolises,
    canBuildMetropolis,
    buildMetropolis,
    downgradeMetropolis,
    calculateMetropolisVP,
    checkMetropolisOwnership,
} from '../metropolis-manager';
import { createTestGameState, createTestPlayer, createTestBoard, createTestVertex } from '@/lib/test-utils';
import type { GameState } from '@/lib/types';

describe('Metropolis Manager', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    improvements: { politics: 0, trade: 0, science: 0 },
                    metropolisOwned: []
                }),
                createTestPlayer({
                    id: 'p2',
                    name: 'Player 2',
                    improvements: { politics: 0, trade: 0, science: 0 },
                    metropolisOwned: []
                }),
            ],
            board: createTestBoard({
                vertices: [
                    createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' }),
                    createTestVertex({ id: '0,0,1', owner: 'p2', structure: 'city' }),
                    createTestVertex({ id: '0,0,2', owner: 'p2', structure: 'city' }),
                ],
                edges: []
            })
        });

        // Ensure metropolises are initialized
        initializeMetropolises(gameState);
    });

    describe('initializeMetropolises', () => {
        it('initializes empty metropolis state', () => {
            const state = createTestGameState();
            delete state.metropolises;
            initializeMetropolises(state);

            expect(state.metropolises).toEqual({
                science: { type: 'science', owner: null, vertexId: null },
                trade: { type: 'trade', owner: null, vertexId: null },
                politics: { type: 'politics', owner: null, vertexId: null },
            });
        });
    });

    describe('canBuildMetropolis', () => {
        it('returns false if improvement level is too low', () => {
            // Level 3 < 4 (Requirement)
            gameState.players[0].improvements!.science = 3;
            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,0')).toBe(false);
        });

        it('returns true if level is sufficient and unclaimed', () => {
            // Level 4
            gameState.players[0].improvements!.science = 4;
            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,0')).toBe(true);
        });

        it('returns false if vertex is not a city', () => {
            gameState.players[0].improvements!.science = 4;
            // Hack structure to settlement
            gameState.board.vertices['0,0,0'].structure = 'settlement';
            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,0')).toBe(false);
        });

        it('returns false if player does not own vertex', () => {
            gameState.players[0].improvements!.science = 4;
            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,1')).toBe(false); // Owned by p2
        });

        it('returns true if stealing with higher level', () => {
            // p2 owns science metropolis at level 4
            gameState.players[1].improvements!.science = 4;
            gameState.metropolises!.science!.owner = 'p2';
            gameState.metropolises!.science!.vertexId = '0,0,1';

            // p1 has level 5
            gameState.players[0].improvements!.science = 5;

            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,0')).toBe(true);
        });

        it('returns false if stealing with equal level', () => {
            // p2 owns science metropolis at level 4
            gameState.players[1].improvements!.science = 4;
            gameState.metropolises!.science!.owner = 'p2';
            gameState.metropolises!.science!.vertexId = '0,0,1';

            // p1 has level 4
            gameState.players[0].improvements!.science = 4;

            expect(canBuildMetropolis(gameState, 'p1', 'science', '0,0,0')).toBe(false);
        });
    });

    describe('buildMetropolis', () => {
        it('builds a metropolis, updating board and player state', () => {
            gameState.players[0].improvements!.science = 4;

            const success = buildMetropolis(gameState, 'p1', '0,0,0', 'science');

            expect(success).toBe(true);
            expect(gameState.board.vertices['0,0,0'].structure).toBe('metropolis');
            expect(gameState.metropolises!.science!.owner).toBe('p1');
            expect(gameState.metropolises!.science!.vertexId).toBe('0,0,0');
            expect(gameState.players[0].metropolisOwned).toContain('science');
            expect(calculateMetropolisVP(gameState.players[0])).toBe(2);
        });

        it('preserves the selected city wall when upgrading to a metropolis', () => {
            gameState.players[0].improvements!.science = 4;
            gameState.board.vertices['0,0,0'].hasCityWall = true;

            const success = buildMetropolis(gameState, 'p1', '0,0,0', 'science');

            expect(success).toBe(true);
            expect(gameState.board.vertices['0,0,0']).toMatchObject({
                structure: 'metropolis',
                hasCityWall: true,
            });
        });

        it('steals metropolis from another player', () => {
            // Setup p2 owning it
            gameState.players[1].improvements!.science = 4;
            buildMetropolis(gameState, 'p2', '0,0,1', 'science');

            // p1 steals with level 5
            gameState.players[0].improvements!.science = 5;

            const success = buildMetropolis(gameState, 'p1', '0,0,0', 'science');

            expect(success).toBe(true);

            // P1 has it
            expect(gameState.metropolises!.science!.owner).toBe('p1');
            expect(gameState.players[0].metropolisOwned).toContain('science');
            expect(gameState.board.vertices['0,0,0'].structure).toBe('metropolis');

            // P2 lost it
            expect(gameState.players[1].metropolisOwned).not.toContain('science');
            expect(gameState.board.vertices['0,0,1'].structure).toBe('city'); // Downgraded
        });
    });

    describe('downgradeMetropolis', () => {
        it('downgrades metropolis to city and removes ownership', () => {
            gameState.players[0].improvements!.science = 4;
            buildMetropolis(gameState, 'p1', '0,0,0', 'science');

            downgradeMetropolis(gameState, 'p1', 'science');

            expect(gameState.board.vertices['0,0,0'].structure).toBe('city');
            expect(gameState.players[0].metropolisOwned).not.toContain('science');
        });
    });

    describe('checkMetropolisOwnership', () => {
        it('transfers ownership if another player has higher level', () => {
            // p1 owns it at level 4
            gameState.players[0].improvements!.science = 4;
            buildMetropolis(gameState, 'p1', '0,0,0', 'science');

            // p2 upgrades to level 5 (simulated state change)
            gameState.players[1].improvements!.science = 5;

            // Check ownership
            checkMetropolisOwnership(gameState, 'science');

            expect(gameState.metropolises!.science!.owner).toBe('p2');
            expect(gameState.metropolises!.science!.vertexId).toBe('0,0,1'); // moved to p2's city
            expect(gameState.board.vertices['0,0,0'].structure).toBe('city'); // p1 downgraded
            expect(gameState.board.vertices['0,0,1'].structure).toBe('metropolis'); // p2 upgraded
            expect(gameState.players[0].metropolisOwned).not.toContain('science');
            expect(gameState.players[1].metropolisOwned).toContain('science');
        });
    });
});
