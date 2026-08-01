import { describe, expect, it, vi } from 'vitest';
import {
    formatTime,
    getTimerStatus,
    requestExtension,
    stopTurnTimer,
    syncTurnTimerPause,
} from '@/lib/services/timer-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types/game';

const CONFIG = {
    enabled: true,
    turnTimeLimit: 120,
    timeBank: 300,
    maxExtensionsPerTurn: 3,
    maxExtraSecondsPerTurn: 180,
    extensionIncrement: 60,
};

/**
 * createTestGameState only copies the fields it knows about, and the timer
 * fields are not among them — so they are layered on afterwards.
 */
function stateWithTimer(overrides: Partial<GameState> = {}): GameState {
    const player = createTestPlayer({ id: 'p1', name: 'Pa' });
    const base = createTestGameState({ players: [player], currentTurn: 'p1' });

    return {
        ...base,
        timerConfig: { ...CONFIG },
        turnStartTime: Date.now(),
        playerTimeBanks: { p1: 300 },
        ...overrides,
    };
}

describe('requestExtension logging', () => {
    it('logs the extension with the amount taken and the resulting bank balance', () => {
        const state = stateWithTimer();

        const result = requestExtension(state, 'p1');

        expect(result.success).toBe(true);
        const logs = result.newState!.logs;
        expect(logs).toHaveLength(1);
        expect(logs[0].playerId).toBe('p1');
        // 5:00 bank, 1:00 borrowed -> 4:00 left. Same clock format as the HUD.
        expect(logs[0].message).toBe('Pa extended their turn by 1:00 from the time bank (5:00 -> 4:00).');
    });

    it('does not mutate the logs of the state it was given', () => {
        const state = stateWithTimer();
        const originalLogs = state.logs;

        requestExtension(state, 'p1');

        expect(state.logs).toHaveLength(0);
        expect(state.logs).toBe(originalLogs);
    });

    it('reports the actual amount granted when the bank cannot cover a full increment', () => {
        const state = stateWithTimer({ playerTimeBanks: { p1: 25 } });

        const result = requestExtension(state, 'p1');

        expect(result.success).toBe(true);
        expect(result.newBankBalance).toBe(0);
        expect(result.newState!.logs[0].message).toBe(
            'Pa extended their turn by 0:25 from the time bank (0:25 -> 0:00).'
        );
    });

    it('appends to existing logs rather than replacing them', () => {
        const state = stateWithTimer({
            logs: [{ id: 'seed', timestamp: 1, message: 'Pa rolled 8' }],
        });

        const result = requestExtension(state, 'p1');

        expect(result.newState!.logs.map(l => l.message)).toEqual([
            'Pa rolled 8',
            'Pa extended their turn by 1:00 from the time bank (5:00 -> 4:00).',
        ]);
    });

    it('logs nothing when the request is rejected', () => {
        const emptyBank = requestExtension(stateWithTimer({ playerTimeBanks: { p1: 0 } }), 'p1');
        expect(emptyBank.success).toBe(false);
        expect(emptyBank.newState).toBeUndefined();

        const notYourTurn = requestExtension(stateWithTimer(), 'p2');
        expect(notYourTurn.success).toBe(false);
        expect(notYourTurn.newState).toBeUndefined();

        const disabled = requestExtension(
            stateWithTimer({ timerConfig: { ...CONFIG, enabled: false } }),
            'p1'
        );
        expect(disabled.success).toBe(false);
        expect(disabled.newState).toBeUndefined();
    });

    it('stops logging once the per-turn extra-time cap is reached', () => {
        const state = stateWithTimer({
            currentTurnExtensions: { count: 1, totalBorrowed: CONFIG.maxExtraSecondsPerTurn },
        });

        const result = requestExtension(state, 'p1');

        expect(result.success).toBe(false);
        expect(result.newState).toBeUndefined();
    });
});

describe('formatTime', () => {
    it('formats as MM:SS, falling back to 0:00 for negatives', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(65)).toBe('1:05');
        expect(formatTime(-5)).toBe('0:00');
    });

    it('adds an hours segment past 3600 seconds', () => {
        expect(formatTime(3725)).toBe('1:02:05');
    });
});

describe('turn timer pauses for other players\' obligations', () => {
    it('freezes elapsed time while another player discards', () => {
        const p2 = createTestPlayer({
            id: 'p2',
            resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        });
        const state = stateWithTimer({
            players: [createTestPlayer({ id: 'p1' }), p2],
            phase: 'discarding',
            turnStartTime: 1_000,
        });

        syncTurnTimerPause(state, 5_000);

        expect(state.turnPausedAt).toBe(5_000);
        expect(getTimerStatus(state, 15_000)).toMatchObject({
            isActive: true,
            isPaused: true,
            timeElapsed: 4,
            timeRemaining: 116,
        });
    });

    it('resumes from the frozen value after the other obligation resolves', () => {
        const state = stateWithTimer({
            pendingAqueduct: ['p2'],
            turnStartTime: 1_000,
        });

        syncTurnTimerPause(state, 5_000);
        state.pendingAqueduct = [];
        syncTurnTimerPause(state, 20_000);

        expect(state.turnPausedAt).toBeUndefined();
        expect(state.turnPausedDurationMs).toBe(15_000);
        expect(getTimerStatus(state, 30_000)).toMatchObject({
            isActive: true,
            isPaused: false,
            timeElapsed: 14,
            timeRemaining: 106,
        });
    });

    it('does not pause for an obligation owned by the active player', () => {
        const state = stateWithTimer({
            pendingAqueduct: ['p1'],
            turnStartTime: 1_000,
        });

        syncTurnTimerPause(state, 5_000);

        expect(state.turnPausedAt).toBeUndefined();
        expect(getTimerStatus(state, 15_000).timeElapsed).toBe(14);
    });

    it('excludes an open pause from total time and borrowed-time refunds', () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(15_000);
            const state = stateWithTimer({
                turnStartTime: 1_000,
                turnPausedAt: 5_000,
                turnPausedDurationMs: 0,
                currentTurnExtensions: { count: 1, totalBorrowed: 60 },
                playerTimeBanks: { p1: 240 },
                playerTotalTime: { p1: 0 },
            });

            const stopped = stopTurnTimer(state, 'p1');

            expect(stopped.playerTotalTime?.p1).toBe(4);
            expect(stopped.playerTimeBanks?.p1).toBe(300);
            expect(stopped.turnPausedAt).toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });
});
