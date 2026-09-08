import { describe, expect, it } from 'vitest';
import { PLAYER_COLOR_OPTIONS } from '@/lib/constants/player-colors';
import { playerPieceColor } from './piece-style';

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map(index => {
        const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
}

describe('miniature ownership paint', () => {
    it('keeps all four owner identities distinct, including the ivory owner', () => {
        const colors = PLAYER_COLOR_OPTIONS.map(({ value }) => playerPieceColor(value));
        expect(new Set(colors).size).toBe(4);
        expect(luminance(playerPieceColor('#d4b483'))).toBeGreaterThan(.85);
    });

    it('gives historical saved colors and named identities the same paint', () => {
        for (const legacy of ['#ff9100', '#ffa500', ' Orange ']) {
            expect(playerPieceColor(legacy)).toBe(playerPieceColor('#ff7a00'));
        }
        for (const legacy of ['white', 'beige']) {
            expect(playerPieceColor(legacy)).toBe(playerPieceColor('#d4b483'));
        }
    });

    it('preserves custom colors without assigning them another player identity', () => {
        expect(playerPieceColor('#8172ab')).toBe('#8172ab');
    });
});
