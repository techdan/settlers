import { describe, expect, it } from 'vitest';
import { TaxationCommand } from '../TaxationCommand';
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
    createTestVertex,
} from '@/lib/test-utils';
import { getVertexIdsForHex } from '@/core/engine/progress/utilities/BoardScanning';
import { createHex } from '@/lib/hex';
import type { BoardHex } from '@/lib/types';

/**
 * Taxation is gated behind the first barbarian attack, so it never got manual
 * QA during the Phase 4.5 pass.
 *
 * The theft assertions below were unreachable until the command's runtime
 * CommonJS runtime imports became ESM imports — Node's loader, which is what
 * vitest hands the module, cannot resolve the `@/` alias.
 */

const HEX_ID = '0,0';

const setup = (opts: {
    hasBarbariansAttacked?: boolean;
    occupants?: [string, boolean][];
    victimOre?: number;
} = {}) => {
    const { hasBarbariansAttacked = true, occupants = [], victimOre = 0 } = opts;

    const hexVertices = getVertexIdsForHex(HEX_ID);
    const vertices = occupants.map(([owner, hasStructure], index) =>
        createTestVertex({
            id: hexVertices[index],
            owner,
            structure: hasStructure ? 'settlement' : null,
        })
    );
    const taxableHex: BoardHex = {
        id: HEX_ID,
        hex: createHex(0, 0),
        terrain: 'forest',
        numberToken: 8,
    };

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
        board: createTestBoard({
            hexes: [taxableHex],
            vertices,
            edges: [],
        }),
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

describe('TaxationCommand theft behavior', () => {
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
