import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildRoad, buildSettlement, buildCity } from '../building-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import * as BuildingValidator from '@/core/validation/building-validator';
import * as BuildingCosts from '@/core/rules/building-costs';
import { getGameStateByRoomId } from '@/lib/repositories/game-repository';

// Mock Repositories
vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

// Mock Validators
vi.mock('@/core/validation/building-validator', () => ({
    isValidMainPhaseRoad: vi.fn(),
    isValidMainPhaseSettlement: vi.fn(),
    isValidMainPhaseCity: vi.fn(),
}));

// Mock Costs
vi.mock('@/core/rules/building-costs', () => ({
    BUILDING_COSTS: {
        road: { wood: 1, brick: 1 },
        settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
        city: { ore: 3, wheat: 2 }
    },
    canAfford: vi.fn(),
    deductCost: vi.fn(),
}));

// Mock Scoring
vi.mock('@/core/engine/scoring/longest-road', () => ({
    updateLongestRoadIncremental: vi.fn(),
}));

vi.mock('@/core/rules/victory-conditions', () => ({
    updateAllVictoryPoints: vi.fn(),
}));

vi.mock('@/lib/services/game-service', () => ({
    checkAndUpdateVictory: vi.fn(),
}));

describe('Building Service', () => {
    let mockGameState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGameState = createTestGameState({
            id: 'game-1',
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    resources: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5 }
                }),
            ],
            currentTurn: 'p1',
            phase: 'main_phase',
            // Minimal board mock
            board: {
                hexes: [],
                vertices: {
                    '0,0,0': { id: '0,0,0', owner: null, structure: null, q: 0, r: 0, d: 0 }
                },
                edges: {
                    '0,0,0': { id: '0,0,0', owner: null, structure: null, q: 0, r: 0, d: 0 }
                }
            }
        });

        vi.mocked(getGameStateByRoomId).mockResolvedValue(mockGameState);
        vi.mocked(BuildingCosts.canAfford).mockReturnValue(true);
        vi.mocked(BuildingValidator.isValidMainPhaseRoad).mockReturnValue(true);
        vi.mocked(BuildingValidator.isValidMainPhaseSettlement).mockReturnValue(true);
        vi.mocked(BuildingValidator.isValidMainPhaseCity).mockReturnValue(true);
    });

    describe('buildRoad', () => {
        it('builds a road if valid and affordable', async () => {
            const result = await buildRoad('room-1', 'p1', '0,0,0');

            expect(result.board.edges['0,0,0'].structure).toBe('road');
            expect(result.board.edges['0,0,0'].owner).toBe('p1');
            expect(BuildingCosts.deductCost).toHaveBeenCalled();
            expect(result.players[0].roadsRemaining).toBe(14); // Started with 15
        });

        it('throws if validation fails', async () => {
            vi.mocked(BuildingValidator.isValidMainPhaseRoad).mockReturnValue(false);

            await expect(buildRoad('room-1', 'p1', '0,0,0'))
                .rejects.toThrow('Invalid road placement');
        });

        it('throws if cannot afford', async () => {
            vi.mocked(BuildingCosts.canAfford).mockReturnValue(false);

            await expect(buildRoad('room-1', 'p1', '0,0,0'))
                .rejects.toThrow('Insufficient resources');
        });
    });

    describe('buildSettlement', () => {
        it('builds a settlement if valid', async () => {
            const result = await buildSettlement('room-1', 'p1', '0,0,0');

            expect(result.board.vertices['0,0,0'].structure).toBe('settlement');
            expect(result.board.vertices['0,0,0'].owner).toBe('p1');
            expect(result.players[0].settlementsRemaining).toBe(4); // Started with 5
        });
    });

    describe('buildCity', () => {
        it('upgrades settlement to city', async () => {
            // Setup pre-existing settlement
            mockGameState.board.vertices['0,0,0'].structure = 'settlement';
            mockGameState.board.vertices['0,0,0'].owner = 'p1';

            const result = await buildCity('room-1', 'p1', '0,0,0');

            expect(result.board.vertices['0,0,0'].structure).toBe('city');
            expect(result.players[0].citiesRemaining).toBe(3); // Started with 4
            expect(result.players[0].settlementsRemaining).toBe(6); // Returned 1 (started with 5)
        });
    });
});
