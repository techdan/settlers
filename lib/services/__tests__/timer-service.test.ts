import { describe, expect, it } from 'vitest';
import { requestExtension, formatTime } from '@/lib/services/timer-service';
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
