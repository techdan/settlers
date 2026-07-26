import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProgressHandView } from '../ProgressHandView';

describe('ProgressHandView', () => {
    it('opens a small-hand drawer used by tablet layouts', async () => {
        const user = userEvent.setup();

        render(
            <ProgressHandView
                cards={[{ type: 'merchant' }, { type: 'wedding' }]}
                onCardClick={vi.fn()}
            />
        );

        const trigger = screen.getByRole('button', { name: 'Progress cards: 2 in hand' });
        await user.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('dialog', { name: 'Progress cards' })).toBeInTheDocument();
    });
});
