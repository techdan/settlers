import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestTimeExtensionForGame } from '@/lib/services/timer-request-service';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types/game';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

const TIMER_CONFIG = {
    enabled: true,
    turnTimeLimit: 120,
    timeBank: 300,
    maxExtensionsPerTurn: 3,
    maxExtraSecondsPerTurn: 180,
    extensionIncrement: 60,
};

function createTimerState(overrides: Partial<GameState> = {}): GameState {
    return {
        ...createTestGameState({
            players: [createTestPlayer({ id: 'p1', name: 'Pa' })],
            currentTurn: 'p1',
        }),
        timerConfig: { ...TIMER_CONFIG },
        turnStartTime: Date.now(),
        playerTimeBanks: { p1: 300 },
        ...overrides,
    };
}

describe('timer request service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads, applies, and persists a valid extension', async () => {
        const gameState = createTimerState();
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

        const result = await requestTimeExtensionForGame('ROOM', 'p1');

        expect(result.success).toBe(true);
        expect(result.newBankBalance).toBe(240);
        expect(updateGameState).toHaveBeenCalledTimes(1);
        expect(vi.mocked(updateGameState).mock.calls[0][0].playerTimeBanks?.p1).toBe(240);
    });

    it('preserves validation errors and does not persist rejected requests', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(
            createTimerState({ playerTimeBanks: { p1: 0 } })
        );

        await expect(requestTimeExtensionForGame('ROOM', 'p1')).rejects.toThrow(
            'No time remaining in bank'
        );
        expect(updateGameState).not.toHaveBeenCalled();
    });

    it('rejects missing games before applying timer logic', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(null);

        await expect(requestTimeExtensionForGame('ROOM', 'p1')).rejects.toThrow('Game not found');
        expect(updateGameState).not.toHaveBeenCalled();
    });
});
