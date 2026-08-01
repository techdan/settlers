import { describe, expect, it } from 'vitest';
import { InventorCommand } from '../InventorCommand';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';

describe('InventorCommand', () => {
    it('records the exact hexes and before/after tokens for player notifications', () => {
        const player = createTestPlayer({ id: 'player-1', name: 'Ada' });
        const state = createTestGameState({
            players: [player],
            board: createTestBoard({
                hexes: [
                    {
                        id: 'forest-5',
                        hex: { q: 0, r: 0, s: 0 },
                        terrain: 'forest',
                        numberToken: 5,
                    },
                    {
                        id: 'field-9',
                        hex: { q: 1, r: 0, s: -1 },
                        terrain: 'field',
                        numberToken: 9,
                    },
                ],
            }),
        });

        new InventorCommand().execute(state, player.id, {
            hex1Id: 'forest-5',
            hex2Id: 'field-9',
        });

        expect(state.lastInventorSwap).toMatchObject({
            playerId: player.id,
            hexes: [
                {
                    id: 'forest-5',
                    resource: 'wood',
                    before: 5,
                    after: 9,
                },
                {
                    id: 'field-9',
                    resource: 'wheat',
                    before: 9,
                    after: 5,
                },
            ],
        });
        expect(state.logs.at(-1)?.message).toContain('Wood square 5 → 9');
        expect(state.logs.at(-1)?.message).toContain('Wheat square 9 → 5');
    });
});
