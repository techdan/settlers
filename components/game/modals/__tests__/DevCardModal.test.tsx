import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTestPlayer } from '@/lib/test-utils';
import { DevCardModal } from '../DevCardModal';

const currentPlayer = createTestPlayer({
    id: 'p1',
    name: 'Player 1'
});

describe('DevCardModal', () => {
    it('submits the selected Year of Plenty resources through the typed option seam', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onPlay = vi.fn().mockResolvedValue(undefined);

        render(
            <DevCardModal
                isOpen
                onClose={onClose}
                cardType="year_of_plenty"
                currentPlayer={currentPlayer}
                onPlay={onPlay}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Take Resources' }));

        expect(onPlay).toHaveBeenCalledWith('year_of_plenty', {
            resource1: 'wood',
            resource2: 'brick'
        });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('passes no options for parameterless cards and surfaces a rejection', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onPlay = vi.fn().mockRejectedValue(new Error('Knight play rejected'));

        render(
            <DevCardModal
                isOpen
                onClose={onClose}
                cardType="knight"
                currentPlayer={currentPlayer}
                onPlay={onPlay}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Move Robber' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Knight play rejected');
        expect(onPlay).toHaveBeenCalledWith('knight', undefined);
        expect(onClose).not.toHaveBeenCalled();
    });
});
