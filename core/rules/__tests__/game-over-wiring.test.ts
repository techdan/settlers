import { describe, expect, it } from 'vitest';
import { checkVictoryCondition } from '../victory-conditions';
import { checkAndUpdateVictory } from '@/lib/services/game-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';

/**
 * The game-over UI is gated on BOTH fields: `GameOverModal` shows on
 * `phase === 'game_over' || winner`, but `GameOverOverlay` requires
 * `phase === 'game_over' && winner`. So any victory path that sets one without
 * the other produces a half-rendered end state. These pin the invariant.
 */

const setup = (opts: { mode?: 'base' | 'cities_and_knights'; vp?: number[] } = {}) => {
    const { mode = 'base', vp = [0, 0] } = opts;

    return createTestGameState({
        roomId: 'room-1',
        gameMode: mode,
        players: vp.map((points, index) =>
            createTestPlayer({ id: `p${index + 1}`, name: `Player ${index + 1}`, victoryPoints: points })
        ),
    });
};

describe('victory threshold', () => {
    it('needs 10 VP in the base game', () => {
        expect(checkVictoryCondition(setup({ vp: [9, 0] }))).toBeNull();
        expect(checkVictoryCondition(setup({ vp: [10, 0] }))).toBe('p1');
    });

    it('needs 13 VP in Cities & Knights', () => {
        expect(checkVictoryCondition(setup({ mode: 'cities_and_knights', vp: [12, 0] }))).toBeNull();
        expect(checkVictoryCondition(setup({ mode: 'cities_and_knights', vp: [13, 0] }))).toBe('p1');
    });

    it('reports a player who has overshot the threshold', () => {
        expect(checkVictoryCondition(setup({ vp: [0, 14] }))).toBe('p2');
    });
});

describe('checkAndUpdateVictory', () => {
    it('leaves the game running when nobody has won', () => {
        const state = setup({ vp: [9, 8] });
        state.phase = 'main_phase';

        expect(checkAndUpdateVictory(state)).toBeNull();
        expect(state.phase).toBe('main_phase');
        // Fixture default is null rather than undefined; what matters to the UI
        // gates is only that it stays falsy.
        expect(state.winner).toBeFalsy();
    });

    it('sets winner and phase together, and announces the win', () => {
        const state = setup({ vp: [10, 3] });
        state.phase = 'main_phase';

        const winnerId = checkAndUpdateVictory(state);

        expect(winnerId).toBe('p1');
        // Both fields must move together or the overlay never renders.
        expect(state.winner).toBe('p1');
        expect(state.phase).toBe('game_over');
        expect(state.logs.at(-1)?.message).toContain('Player 1 wins with 10 victory points!');
    });

    it('produces a state that satisfies both game-over UI gates', () => {
        const state = setup({ mode: 'cities_and_knights', vp: [13, 5] });
        checkAndUpdateVictory(state);

        // GameController: shouldShowGameOverModal
        expect(state.phase === 'game_over' || !!state.winner).toBe(true);
        // GameController: shouldShowGameOverOverlay (the stricter gate)
        expect(state.phase === 'game_over' && !!state.winner).toBe(true);
    });
});
