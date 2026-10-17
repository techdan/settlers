import { describe, expect, it } from 'vitest';
import { TT } from '@/themes/tabletop/palette';
import { PLAYER_COLOR_OPTIONS } from '@/lib/constants/player-colors';
import { miniatureMaterialPaint } from './miniature-palette';
import { playerPieceColor } from './piece-style';

function hueAndSaturation(hex: string): [number, number] {
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const high = Math.max(r, g, b), low = Math.min(r, g, b), span = high - low;
    if (!span) return [0, 0];
    const hue = high === r ? ((g - b) / span + 6) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4;
    return [hue * 60, span / (1 - Math.abs(high + low - 1))];
}

describe('local 3D miniature palette', () => {
    it.each(Object.entries(TT.terrain))('quiets %s pigment while preserving its resource hue', (terrain, palette) => {
        const source = `paint-${palette.base.slice(1)}`;
        const updated = miniatureMaterialPaint(`foundation-${terrain}`, source);
        expect(updated).toBeDefined();
        const [oldHue, oldSaturation] = hueAndSaturation(palette.base);
        const [newHue, newSaturation] = hueAndSaturation(updated!.color);
        expect(Math.abs(newHue - oldHue)).toBeLessThan(12);
        expect(newSaturation).toBeLessThan(oldSaturation);
    });

    it('keeps all owner body and roof paints exact, with detail changes limited to ivory', () => {
        for (const { value } of PLAYER_COLOR_OPTIONS) {
            const paint = playerPieceColor(value);
            expect(miniatureMaterialPaint('building-city', 'owner-paint', paint)?.color).toBe(paint);
            expect(miniatureMaterialPaint('building-city', 'paint-6c4e31', paint)?.color).toBe(paint);
        }
        expect(miniatureMaterialPaint('building-city', 'paint-c8bda5', playerPieceColor('red'))).toBeUndefined();
        expect(miniatureMaterialPaint('building-city', 'paint-c8bda5', playerPieceColor('white'))).toBeDefined();
    });

    it('defines ivory knight details while keeping active bronze distinct from inactive pewter', () => {
        const ivory = playerPieceColor('white');
        expect(miniatureMaterialPaint('knight-1-1', 'paint-bdb9a8', ivory)).toBeDefined();
        const active = miniatureMaterialPaint('knight-1-1', 'paint-c9973f', ivory)?.color;
        const inactive = miniatureMaterialPaint('knight-1-0', 'paint-8e8a7d', ivory)?.color;
        expect(active).toBeDefined();
        expect(inactive).toBeDefined();
        expect(active).not.toBe(inactive);
    });

    it('leaves incidental props and other model families in their original materials', () => {
        expect(miniatureMaterialPaint('terrain-pasture-0', 'paint-f4f1e4')).toBeUndefined();
        expect(miniatureMaterialPaint('harbor-wood', 'paint-e8dcc0')).toBeUndefined();
        expect(miniatureMaterialPaint('barbarian-boat', 'paint-e8dcc0')).toBeUndefined();
        expect(miniatureMaterialPaint('traveler-merchant', 'owner-paint', playerPieceColor('white'))).toEqual({ color: playerPieceColor('white') });
    });
});
