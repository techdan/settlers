import { describe, expect, it } from 'vitest';
import {
    generateStandardBoard,
    generateBoard,
    getDesertHexId,
    BoardGenerationOptions
} from '../board-generator';
import { TERRAIN_COUNTS, TOKEN_COUNTS } from '@/core/rules/board-constants';

describe('Board Generator', () => {
    describe('generateStandardBoard', () => {
        it('generates the standard fixed layout', () => {
            const board = generateStandardBoard();
            expect(board).toHaveLength(19);

            // Check a few known fixed tiles
            // { q: 0, r: -2, terrain: 'mountain', num: 10 }
            const top = board.find(t => t.hex.q === 0 && t.hex.r === -2);
            expect(top).toBeDefined();
            expect(top?.terrain).toBe('mountain');
            expect(top?.numberToken).toBe(10);

            // { q: 0, r: 0, terrain: 'desert', num: null }
            const desert = board.find(t => t.hex.q === 0 && t.hex.r === 0);
            expect(desert).toBeDefined();
            expect(desert?.terrain).toBe('desert');
            expect(desert?.numberToken).toBeNull();
        });
    });

    describe('generateBoard', () => {
        const options: BoardGenerationOptions = { fairMode: false };

        it('generates a valid board with 19 hexes', () => {
            const board = generateBoard(options);
            expect(board).toHaveLength(19);
        });

        it('respects terrain counts', () => {
            const board = generateBoard(options);
            const counts: Record<string, number> = {};
            board.forEach(t => {
                const type = t.terrain;
                counts[type] = (counts[type] || 0) + 1;
            });

            // TERRAIN_COUNTS has singular names but code uses singular types now (updated in recent files)
            // except TERRAIN_COUNTS in board-constants.ts was viewed earlier and had singular keys 'forest', 'pasture', etc.
            // Let's verify counts against imported constant.
            expect(counts['forest']).toBe(TERRAIN_COUNTS.forest);
            expect(counts['hill']).toBe(TERRAIN_COUNTS.hill);
            expect(counts['pasture']).toBe(TERRAIN_COUNTS.pasture);
            expect(counts['field']).toBe(TERRAIN_COUNTS.field);
            expect(counts['mountain']).toBe(TERRAIN_COUNTS.mountain);
            expect(counts['desert']).toBe(TERRAIN_COUNTS.desert);
        });

        it('respects token counts', () => {
            const board = generateBoard(options);
            const counts: Record<number, number> = {};
            board.forEach(t => {
                if (t.numberToken) {
                    counts[t.numberToken] = (counts[t.numberToken] || 0) + 1;
                }
            });

            // TOKEN_COUNTS: 2->1, 3->2, ... 12->1
            expect(counts[2]).toBe(TOKEN_COUNTS[2]); // 1
            expect(counts[3]).toBe(TOKEN_COUNTS[3]); // 2
            expect(counts[6]).toBe(TOKEN_COUNTS[6]); // 2
            expect(counts[8]).toBe(TOKEN_COUNTS[8]); // 2
            expect(counts[12]).toBe(TOKEN_COUNTS[12]); // 1
        });

        it('does NOT place tokens on desert', () => {
            const board = generateBoard(options);
            const desert = board.filter(t => t.terrain === 'desert');
            expect(desert).toHaveLength(1);
            expect(desert[0].numberToken).toBeNull();
            expect(desert[0].pips).toBe(0);
        });

        it('enforces adjacency rules (no red neighbors)', () => {
            // Run multiple times to be sure, as it's random
            for (let i = 0; i < 5; i++) {
                const board = generateBoard({ fairMode: true });
                // Check every 6/8 hex
                const redHexes = board.filter(t => t.numberToken === 6 || t.numberToken === 8);

                redHexes.forEach(red => {
                    // Find neighbors
                    // We can't use helper getNeighbors here easily unless we export it or duplicate logic.
                    // Let's duplicate basic adjacency check logic
                    const neighbors = board.filter(t => {
                        const dq = t.hex.q - red.hex.q;
                        const dr = t.hex.r - red.hex.r;
                        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
                        return dist === 1;
                    });

                    neighbors.forEach(n => {
                        const isRed = n.numberToken === 6 || n.numberToken === 8;
                        expect(isRed).toBe(false); // Should not have red neighbor
                    });
                });
            }
        });
    });

    describe('getDesertHexId', () => {
        it('returns correct desert ID', () => {
            const board = generateStandardBoard();
            const id = getDesertHexId(board);
            expect(id).toBe('0,0'); // Standard board desert is at 0,0
        });
    });
});
