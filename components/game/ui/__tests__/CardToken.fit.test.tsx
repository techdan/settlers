import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    CARD_TOKEN_GAP,
    CARD_TOKEN_HEIGHT,
    CARD_TOKEN_WIDTH,
    CardRow,
    CardToken,
    MAX_CARD_TYPES,
    MODAL_LG_CONTENT_WIDTH,
    MODAL_MD_CONTENT_WIDTH,
} from '../CardToken';
import { ALL_TRADE_ITEMS } from '@/lib/trade/bank-ratios';

/**
 * jsdom has no layout engine, so it cannot tell us what wrapped. What it *can* do
 * is hold the geometry to the arithmetic that decides whether anything wraps —
 * which is the part a person gets wrong. A `gap-3` (12px) row shipped briefly and
 * overflowed by exactly 4px, stranding one token on a second row on desktop.
 *
 * For the real thing, /dev/viewports renders these rows in iframes at device widths.
 */
describe('card row geometry', () => {
    it('fits a full hand of eight card types on one row of a width="lg" modal', () => {
        const needed = MAX_CARD_TYPES * CARD_TOKEN_WIDTH + (MAX_CARD_TYPES - 1) * CARD_TOKEN_GAP;

        expect(needed).toBeLessThanOrEqual(MODAL_LG_CONTENT_WIDTH);
    });

    it('fits all five resources on one row of a width="md" modal', () => {
        // Where the progress-card pickers live (Resource Monopoly / Trade Monopoly).
        const needed = 5 * CARD_TOKEN_WIDTH + 4 * CARD_TOKEN_GAP;

        expect(needed).toBeLessThanOrEqual(MODAL_MD_CONTENT_WIDTH);
    });

    it('has a token narrow enough for the tightest phone we support', () => {
        // 320px viewport − 32px wrapper padding − 48px body padding = 240px content.
        expect(CARD_TOKEN_WIDTH).toBeLessThanOrEqual(240);
    });

    it('covers every tradeable card type in the eight-type worst case', () => {
        expect(ALL_TRADE_ITEMS).toHaveLength(MAX_CARD_TYPES);
    });

    it('renders tokens at the width the arithmetic assumes', () => {
        render(
            <CardRow label="Test row">
                <CardToken type="wood" onClick={vi.fn()} ariaLabel="Wood" />
            </CardRow>
        );

        const token = screen.getByRole('button', { name: 'Wood' });
        expect(token.style.width).toBe(`${CARD_TOKEN_WIDTH}px`);
        expect(token.style.height).toBe(`${CARD_TOKEN_HEIGHT}px`);
    });

    it('keeps the row wrapping with the gap the arithmetic assumes', () => {
        render(
            <CardRow label="Test row">
                {ALL_TRADE_ITEMS.map(item => (
                    <CardToken key={item} type={item} onClick={vi.fn()} ariaLabel={item} />
                ))}
            </CardRow>
        );

        const row = screen.getByRole('group', { name: 'Test row' });
        expect(row.className).toMatch(/flex-wrap/);
        expect(row.style.gap).toBe(`${CARD_TOKEN_GAP}px`);
        expect(row.children).toHaveLength(MAX_CARD_TYPES);
    });
});
