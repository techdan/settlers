import { describe, expect, it, vi, beforeEach } from 'vitest';
import { startGame, rollDice, endTurn } from '../game-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';

// Mock Repositories
vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
    createGame: vi.fn(),
}));

vi.mock('@/lib/repositories/room-repository', () => ({
    updateRoomStatus: vi.fn(),
}));

// Mock Lobby Service
vi.mock('@/lib/services/lobby-service', () => ({
    LobbyService: {
        getPlayersWithColors: vi.fn().mockResolvedValue([
            { id: 'p1', name: 'Player 1', color: 'red' },
            { id: 'p2', name: 'Player 2', color: 'blue' },
        ]),
        getLobbyState: vi.fn().mockResolvedValue({ boardPreview: [] }),
    }
}));

// Mock dynamic imports or other services if needed
vi.mock('@/core/engine/progress/progress-card-definitions', () => ({
    createProgressDecks: () => ({ science: [], trade: [], politics: [] }),
}));

import { createGame, getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';

describe('Game Service', () => {
    let mockGameState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGameState = createTestGameState({
            id: 'game-1',
            players: [
                createTestPlayer({ id: 'p1', name: 'Player 1' }),
                createTestPlayer({ id: 'p2', name: 'Player 2' }),
            ],
            currentTurn: 'p1',
            turnOrder: ['p1', 'p2'],
            phase: 'waiting_for_roll',
            gameMode: 'cities_and_knights'
        });

        // Setup repository mock returns
        vi.mocked(getGameStateByRoomId).mockResolvedValue(mockGameState);
    });

    describe('startGame', () => {
        it('initializes game with correct mode and players', async () => {
            const game = await startGame('room-1', 'cities_and_knights');

            expect(game.gameMode).toBe('cities_and_knights');
            expect(game.players).toHaveLength(2);
            expect(game.phase).toBe('setup_round_1_settlement'); // Based on implementation

            // Verify C&K fields initialized
            expect(game.metropolises).toBeDefined();
            expect(game.players[0].commodities).toBeDefined();
            expect(game.players[0].improvements).toBeDefined();

            expect(createGame).toHaveBeenCalled();
        });
    });

    describe('rollDice', () => {
        it('rolls dice and processes event die in C&K mode', async () => {
            // We can't easily see the random values unless we mock Math.random
            // But we can verify state changes.

            const result = await rollDice('room-1', 'p1');

            expect(result.diceRoll).toBeDefined();
            expect(result.eventDieRoll).toBeDefined(); // C&K mode
            expect(updateGameState).toHaveBeenCalled();
            expect(result.phase).toBe('main_phase'); // Transitions to main phase
        });

        it('throws if not player turn', async () => {
            // currentTurn is p1
            await expect(rollDice('room-1', 'p2'))
                .rejects.toThrow('Not your turn');
        });
    });

    describe('endTurn', () => {
        beforeEach(() => {
            mockGameState.phase = 'main_phase';
        });

        it('rotates turn to next player', async () => {
            const result = await endTurn('room-1', 'p1');

            expect(result.currentTurn).toBe('p2');
            expect(result.phase).toBe('waiting_for_roll');
            expect(updateGameState).toHaveBeenCalled();
        });

        it('fails if not main phase', async () => {
            mockGameState.phase = 'waiting_for_roll';
            await expect(endTurn('room-1', 'p1'))
                .rejects.toThrow('Can only end turn during main phase');
        });

        it('enforces progress card hand limit (4) in C&K', async () => {
            mockGameState.players[0].progressCards = ['mining', 'mining', 'mining', 'mining', 'mining']; // 5 cards

            await expect(endTurn('room-1', 'p1'))
                .rejects.toThrow(/discard down to 4/);
        });
    });
});
