import { describe, expect, it } from 'vitest';
import { TreasonCommand } from '../TreasonCommand';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { isTreasonEffect } from '@/lib/types/effects';
import { Knight } from '@/lib/types';

/**
 * Treason is a two-stage interaction: playing it only parks an effect in
 * `awaiting_knight`; the target then removes a knight and the initiator places
 * a replacement (both handled in progress-card-service). These cover stage one.
 *
 * Like Taxation, Treason is gated behind the first barbarian attack and so
 * never got manual QA during the Phase 4.5 pass.
 */

const knight = (id: string, playerId: string): Knight => ({
    id,
    playerId,
    vertexId: '0,0,0',
    level: 'basic',
    active: true,
});

const setup = (opts: { hasBarbariansAttacked?: boolean; opponentKnights?: Knight[] } = {}) => {
    const { hasBarbariansAttacked = true, opponentKnights = [knight('k1', 'p2')] } = opts;

    return createTestGameState({
        roomId: 'room-1',
        gameMode: 'cities_and_knights',
        hasBarbariansAttacked,
        players: [
            createTestPlayer({ id: 'p1', name: 'Plotter' }),
            createTestPlayer({ id: 'p2', name: 'Target', knights: opponentKnights }),
        ],
    });
};

describe('TreasonCommand', () => {
    it('refuses to play before the first barbarian attack', () => {
        const state = setup({ hasBarbariansAttacked: false });

        expect(() => new TreasonCommand().execute(state, 'p1', { opponentId: 'p2' }))
            .toThrow('Cannot play Treason before the first barbarian attack');
        expect(state.activeEffects ?? []).toHaveLength(0);
    });

    it('requires an opponent selection', () => {
        const state = setup();

        expect(() => new TreasonCommand().execute(state, 'p1', undefined))
            .toThrow('Treason requires selecting an opponent');
    });

    it('rejects an opponent who is not in the game', () => {
        const state = setup();

        expect(() => new TreasonCommand().execute(state, 'p1', { opponentId: 'ghost' }))
            .toThrow('Opponent not found');
    });

    it('rejects an opponent with no knights to remove', () => {
        const state = setup({ opponentKnights: [] });

        expect(() => new TreasonCommand().execute(state, 'p1', { opponentId: 'p2' }))
            .toThrow('Opponent has no knights to remove');
        expect(state.activeEffects ?? []).toHaveLength(0);
    });

    it('parks an awaiting_knight effect naming both sides', () => {
        const state = setup();

        const result = new TreasonCommand().execute(state, 'p1', { opponentId: 'p2' });

        const effects = (result.activeEffects ?? []).filter(isTreasonEffect);
        expect(effects).toHaveLength(1);
        expect(effects[0]).toMatchObject({
            type: 'treason',
            initiatorId: 'p1',
            targetPlayerId: 'p2',
            stage: 'awaiting_knight',
        });
        expect(result.logs.at(-1)?.message).toContain('Treason targeting Target');
    });

    it('replaces a prior Treason effect from the same player rather than stacking', () => {
        const state = setup();
        state.players.push(createTestPlayer({ id: 'p3', name: 'Other', knights: [knight('k2', 'p3')] }));

        new TreasonCommand().execute(state, 'p1', { opponentId: 'p2' });
        const result = new TreasonCommand().execute(state, 'p1', { opponentId: 'p3' });

        const effects = (result.activeEffects ?? []).filter(isTreasonEffect);
        expect(effects).toHaveLength(1);
        expect(effects[0].targetPlayerId).toBe('p3');
    });

    it('leaves another player\'s Treason effect in place', () => {
        const state = setup();
        state.players.push(createTestPlayer({ id: 'p3', name: 'Other', knights: [knight('k2', 'p3')] }));

        new TreasonCommand().execute(state, 'p3', { opponentId: 'p2' });
        const result = new TreasonCommand().execute(state, 'p1', { opponentId: 'p2' });

        const effects = (result.activeEffects ?? []).filter(isTreasonEffect);
        expect(effects).toHaveLength(2);
        expect(effects.map(e => e.initiatorId).sort()).toEqual(['p1', 'p3']);
    });
});
