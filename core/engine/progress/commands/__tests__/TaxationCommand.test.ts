import { describe, expect, it } from 'vitest';
import { TaxationCommand } from '../TaxationCommand';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getVertexIdsForHex } from '@/core/engine/progress/utilities/BoardScanning';

/**
 * Taxation is gated behind the first barbarian attack, so it never got manual
 * QA during the Phase 4.5 pass.
 *
 * COVERAGE LIMIT: `TaxationCommand.execute` calls `require('@/...')` at runtime
 * (lines 38/50/51). Next's bundler resolves that alias; Node's require, which is
 * what vitest hands the module, does not — and could not load a `.ts` file even
 * if it did. So every assertion past the validation guards is unreachable from a
 * test today. The skipped block below is the coverage we want; it should pass
 * unchanged once those three `require()` calls become ESM imports.
 */

const HEX_ID = '0,0';

const setup = (opts: {
    hasBarbariansAttacked?: boolean;
    occupants?: [string, boolean][];
    victimOre?: number;
} = {}) => {
    const { hasBarbariansAttacked = true, occupants = [], victimOre = 0 } = opts;

    const hexVertices = getVertexIdsForHex(HEX_ID);
    const vertices = occupants.map(([owner, hasStructure], index) => ({
        id: hexVertices[index],
        owner,
        structure: hasStructure ? 'settlement' : undefined,
    }));

    return createTestGameState({
        roomId: 'room-1',
        gameMode: 'cities_and_knights',
        hasBarbariansAttacked,
        robberHexId: '9,9',
        players: [
            createTestPlayer({ id: 'p1', name: 'Taxman' }),
            createTestPlayer({
                id: 'p2',
                name: 'Victim',
                resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: victimOre },
            }),
        ],
        board: {
            hexes: [{ id: HEX_ID, q: 0, r: 0, terrain: 'forest', numberToken: 8 }],
            vertices: Object.fromEntries(vertices.map(v => [v.id, v])),
            edges: {},
        } as any,
    });
};

describe('TaxationCommand validation', () => {
    it('refuses to move the robber before the first barbarian attack', () => {
        const state = setup({ hasBarbariansAttacked: false });

        expect(() => new TaxationCommand().execute(state, 'p1', { hexId: HEX_ID }))
            .toThrow('Cannot move the robber before the first barbarian attack');
        // The robber must not have moved as a side effect of the rejected call.
        expect(state.robberHexId).toBe('9,9');
    });

    it('requires a hex selection', () => {
        const state = setup();

        expect(() => new TaxationCommand().execute(state, 'p1', {}))
            .toThrow('Taxation requires selecting a hex to move the robber');
        expect(state.robberHexId).toBe('9,9');
    });

    it('rejects a hex that is not on the board', () => {
        const state = setup();

        expect(() => new TaxationCommand().execute(state, 'p1', { hexId: 'nope' }))
            .toThrow('Invalid hex selection');
        expect(state.robberHexId).toBe('9,9');
    });

    it('rejects an unknown player', () => {
        const state = setup();

        expect(() => new TaxationCommand().execute(state, 'ghost', { hexId: HEX_ID }))
            .toThrow('Player not found');
    });
});

// Unskip once TaxationCommand's require() calls become ESM imports.
describe.skip('TaxationCommand theft behavior (blocked by runtime require)', () => {
    it('moves the robber and steals from each opponent built on the hex', () => {
        const state = setup({ occupants: [['p2', true]], victimOre: 3 });

        const result = new TaxationCommand().execute(state, 'p1', { hexId: HEX_ID });

        expect(result.robberHexId).toBe(HEX_ID);
        expect(result.players[0].resources.ore).toBe(1);
        expect(result.players[1].resources.ore).toBe(2);
        expect(result.lastTheft?.thiefId).toBe('p1');
        expect(result.lastTheft?.victims).toEqual([
            { victimId: 'p2', items: [{ type: 'resource', value: 'ore', count: 1 }] },
        ]);
    });

    it('does not steal from the player who played it', () => {
        const state = setup({ occupants: [['p1', true]] });

        const result = new TaxationCommand().execute(state, 'p1', { hexId: HEX_ID });

        expect(result.lastTheft).toBeUndefined();
        expect(result.logs.at(-1)?.message).toContain('no one to steal from');
    });

    it('ignores owned vertices with no structure built on them', () => {
        const state = setup({ occupants: [['p2', false]], victimOre: 3 });

        const result = new TaxationCommand().execute(state, 'p1', { hexId: HEX_ID });

        expect(result.lastTheft).toBeUndefined();
        expect(result.players[1].resources.ore).toBe(3);
    });
});
