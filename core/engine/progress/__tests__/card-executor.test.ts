import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getCardExecutor, CardExecutor } from '../CardExecutor';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import * as ResourceEffects from '../effects/ResourceEffects';

// Mock the ResourceEffects module
vi.mock('../effects/ResourceEffects', () => ({
    executeAddResourcePerHex: vi.fn((state) => state),
    executeAddResourcePerBuilding: vi.fn((state) => state),
    executeAddCommodityPerCity: vi.fn((state) => state),
    executeStealFromOpponents: vi.fn((state) => state),
    executeUpgradeKnight: vi.fn((state) => state),
    executeActivateKnight: vi.fn((state) => state),
    executePromoteKnight: vi.fn((state) => state),
    executeFreeRoad: vi.fn((state) => state),
    executeFreeCityWall: vi.fn((state) => state),
}));

describe('CardExecutor', () => {
    let gameState: GameState;
    let executor: CardExecutor;

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Player 1' }),
            ],
            gameMode: 'cities_and_knights'
        });

        executor = getCardExecutor();
        vi.clearAllMocks();
    });

    describe('execute', () => {
        it('throws error for unimplemented/unknown card', () => {
            expect(() => executor.execute('unknown_card' as any, gameState, 'p1'))
                .toThrow(/not implemented|not found/);
        });

        it('executes simple config cards (Irrigation)', () => {
            executor.execute('irrigation', gameState, 'p1');

            expect(ResourceEffects.executeAddResourcePerHex).toHaveBeenCalled();

            const callArgs = vi.mocked(ResourceEffects.executeAddResourcePerHex).mock.calls[0];
            expect(callArgs[1]).toBe('p1');
            // Verify correct config was passed
            expect(callArgs[2].type).toBe('add_resource_per_hex');
        });

        it('delegates to complex commands (Engineer)', () => {
            // Check execution delegates to command, which throws due to missing options/state
            // This confirms delegation occurred.
            expect(() => executor.execute('engineer', gameState, 'p1'))
                .toThrow(/Engineering requires/);
        });
    });
});
