import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProgressCardType } from '@/lib/types/player';
import { ProgressCardDiscardDialog } from '../ProgressCardDiscardDialog';

const hand: ProgressCardType[] = ['merchant', 'merchant', 'alchemist', 'crane', 'inventor'];

describe('progress-card discard copies', () => {
    it('selects and submits one duplicate independently, allowing deselection and switching copies', async () => {
        const onDiscard = vi.fn().mockResolvedValue(undefined);
        render(<ProgressCardDiscardDialog cards={hand} maxCards={4} onDiscard={onDiscard} onClose={vi.fn()} turnContext="other_turn" />);
        const first = screen.getByRole('button', { name: 'Merchant, copy 1 of 2' });
        const second = screen.getByRole('button', { name: 'Merchant, copy 2 of 2' });
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'true');
        expect(second).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(first);
        expect(first).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(second);
        fireEvent.click(screen.getByRole('button', { name: 'Discard 1/1' }));
        await waitFor(() => expect(onDiscard).toHaveBeenCalledWith(['merchant']));
    });

    it('can discard two copies when two discards are required', async () => {
        const onDiscard = vi.fn().mockResolvedValue(undefined);
        render(<ProgressCardDiscardDialog cards={[...hand, 'smith']} maxCards={4} onDiscard={onDiscard} onClose={vi.fn()} turnContext="other_turn" />);
        fireEvent.click(screen.getByRole('button', { name: 'Merchant, copy 1 of 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Merchant, copy 2 of 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Discard 2/2' }));
        await waitFor(() => expect(onDiscard).toHaveBeenCalledWith(['merchant', 'merchant']));
    });

    it('keeps selection across identical snapshots and resets it when the hand changes', () => {
        const props = { maxCards: 4, onDiscard: vi.fn(), onClose: vi.fn(), turnContext: 'other_turn' as const };
        const { rerender } = render(<ProgressCardDiscardDialog {...props} cards={hand} />);
        fireEvent.click(screen.getByRole('button', { name: 'Merchant, copy 1 of 2' }));
        rerender(<ProgressCardDiscardDialog {...props} cards={[...hand]} />);
        expect(screen.getByRole('button', { name: 'Discard 1/1' })).toBeEnabled();
        rerender(<ProgressCardDiscardDialog {...props} cards={['smith', ...hand.slice(1)]} />);
        expect(screen.getByRole('button', { name: 'Discard 0/1' })).toBeDisabled();
    });
});
