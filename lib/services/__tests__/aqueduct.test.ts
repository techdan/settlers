import { describe, expect, it, vi, beforeEach } from 'vitest';
import { claimAqueductResource } from '../game-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

/**
 * Aqueduct (Science level 3) lets a player who produced nothing on a roll take
 * one resource instead. The failure mode worth guarding is a *deadlock* rather
 * than a crash: `rollDice` refuses to proceed while `pendingAqueduct` is
 * non-empty in the `aqueduct_selection` phase, so if the pending list is ever
 * left un-drained the game soft-locks with no error.
 */

const setup = (overrides: Parameters<typeof createTestGameState>[0] = {}) =>
    createTestGameState({
        roomId: 'room-1',
        gameMode: 'cities_and_knights',
        players: [
            createTestPlayer({ id: 'p1', name: 'Scientist', improvements: { science: 3, trade: 0, politics: 0 } }),
            createTestPlayer({ id: 'p2', name: 'Other', improvements: { science: 3, trade: 0, politics: 0 } }),
        ],
        ...overrides,
    });

describe('claimAqueductResource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects a player who is not on the pending list', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(
            setup({ pendingAqueduct: ['p1'], phase: 'aqueduct_selection' })
        );

        await expect(claimAqueductResource('room-1', 'p2', 'ore'))
            .rejects.toThrow('You are not eligible for Aqueduct');
        expect(updateGameState).not.toHaveBeenCalled();
    });

    it('rejects when no Aqueduct selection is pending at all', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(setup({ phase: 'main_phase' }));

        await expect(claimAqueductResource('room-1', 'p1', 'ore'))
            .rejects.toThrow('You are not eligible for Aqueduct');
    });

    it('grants the resource and clears the pending state for a lone claimant', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(
            setup({
                pendingAqueduct: ['p1'],
                phase: 'aqueduct_selection',
                aqueductResumePhase: 'waiting_for_roll',
            })
        );

        const result = await claimAqueductResource('room-1', 'p1', 'wheat');

        expect(result.players[0].resources.wheat).toBe(1);
        expect(result.pendingAqueduct).toBeUndefined();
        expect(result.aqueductResumePhase).toBeUndefined();
        expect(result.phase).toBe('waiting_for_roll');
        expect(result.logs.at(-1)?.message).toContain('used Aqueduct to take 1 wheat');
    });

    it('keeps the game blocked until every pending player has chosen', async () => {
        const state = setup({
            pendingAqueduct: ['p1', 'p2'],
            phase: 'aqueduct_selection',
            aqueductResumePhase: 'waiting_for_roll',
        });
        vi.mocked(getGameStateByRoomId).mockResolvedValue(state);

        const afterFirst = await claimAqueductResource('room-1', 'p1', 'ore');

        // Still blocked — p2 has not chosen yet.
        expect(afterFirst.pendingAqueduct).toEqual(['p2']);
        expect(afterFirst.phase).toBe('aqueduct_selection');

        const afterSecond = await claimAqueductResource('room-1', 'p2', 'brick');

        // Drained: the phase must resume or the game soft-locks.
        expect(afterSecond.pendingAqueduct).toBeUndefined();
        expect(afterSecond.phase).toBe('waiting_for_roll');
        expect(afterSecond.players[0].resources.ore).toBe(1);
        expect(afterSecond.players[1].resources.brick).toBe(1);
    });

    it('falls back to waiting_for_roll when no resume phase was recorded', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(
            setup({ pendingAqueduct: ['p1'], phase: 'aqueduct_selection' })
        );

        const result = await claimAqueductResource('room-1', 'p1', 'sheep');

        expect(result.phase).toBe('waiting_for_roll');
    });

    it('does not disturb the phase when the claim came from an unblocked phase', async () => {
        vi.mocked(getGameStateByRoomId).mockResolvedValue(
            setup({ pendingAqueduct: ['p1'], phase: 'main_phase' })
        );

        const result = await claimAqueductResource('room-1', 'p1', 'wood');

        expect(result.players[0].resources.wood).toBe(1);
        expect(result.phase).toBe('main_phase');
    });

    it('rejects a second claim from a player who already took their resource', async () => {
        const state = setup({ pendingAqueduct: ['p1', 'p2'], phase: 'aqueduct_selection' });
        vi.mocked(getGameStateByRoomId).mockResolvedValue(state);

        await claimAqueductResource('room-1', 'p1', 'ore');

        await expect(claimAqueductResource('room-1', 'p1', 'ore'))
            .rejects.toThrow('You are not eligible for Aqueduct');
    });
});
