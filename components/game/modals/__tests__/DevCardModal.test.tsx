import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTestPlayer } from '@/lib/test-utils';
import type { DevCardType } from '@/lib/types/player';
import { DevCardModal } from '../DevCardModal';

const currentPlayer = createTestPlayer({
    id: 'p1',
    name: 'Player 1'
});

function renderCard(cardType: DevCardType, onPlay = vi.fn().mockResolvedValue(undefined)) {
    const onClose = vi.fn();
    render(
        <DevCardModal
            isOpen
            onClose={onClose}
            cardType={cardType}
            currentPlayer={currentPlayer}
            onPlay={onPlay}
        />
    );
    return { onPlay, onClose };
}

const takeRow = () => screen.getByRole('group', { name: 'Resources to take' });

describe('DevCardModal — Year of Plenty', () => {
    it('will not play until two cards are chosen', async () => {
        const user = userEvent.setup();
        const { onPlay } = renderCard('year_of_plenty');

        // Previously this submitted wood + brick from an unseen default, so a
        // stray click spent the card on resources nobody picked.
        const play = () => screen.getByRole('button', { name: 'Take Resources' });
        expect(play()).toBeDisabled();

        await user.click(within(takeRow()).getByRole('button', { name: /Take one more Wood/ }));
        expect(play()).toBeDisabled();

        await user.click(within(takeRow()).getByRole('button', { name: /Take one more Ore/ }));
        expect(play()).toBeEnabled();

        await user.click(play());
        expect(onPlay).toHaveBeenCalledWith('year_of_plenty', { resource1: 'wood', resource2: 'ore' });
    });

    it('takes two of the same resource from one card, clicked twice', async () => {
        const user = userEvent.setup();
        const { onPlay, onClose } = renderCard('year_of_plenty');

        const ore = () => within(takeRow()).getByRole('button', { name: /Take one more Ore/ });
        await user.click(ore());
        await user.click(ore());

        expect(within(takeRow()).getByRole('button', { name: 'Take one more Ore, taking 2 of 2' }))
            .toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Take Resources' }));
        expect(onPlay).toHaveBeenCalledWith('year_of_plenty', { resource1: 'ore', resource2: 'ore' });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('stops at two and explains why the rest are closed', async () => {
        const user = userEvent.setup();
        renderCard('year_of_plenty');

        await user.click(within(takeRow()).getByRole('button', { name: /Take one more Wood/ }));
        await user.click(within(takeRow()).getByRole('button', { name: /Take one more Wood/ }));

        const brick = within(takeRow()).getByRole('button', { name: /Take one more Brick/ });
        expect(brick).toBeDisabled();
        expect(brick).toHaveAttribute('title', 'You have already chosen 2 cards');
    });

    it('puts a card back with the corner action', async () => {
        const user = userEvent.setup();
        renderCard('year_of_plenty');

        await user.click(within(takeRow()).getByRole('button', { name: /Take one more Sheep/ }));
        await user.click(within(takeRow()).getByRole('button', { name: 'Take one fewer Sheep' }));

        expect(within(takeRow()).getByRole('button', { name: 'Take one more Sheep, taking 0 of 2' }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Take Resources' })).toBeDisabled();
    });
});

describe('DevCardModal — Monopoly', () => {
    it('will not play until a resource is named', async () => {
        const user = userEvent.setup();
        const { onPlay } = renderCard('monopoly');

        const play = () => screen.getByRole('button', { name: 'Monopolize' });
        expect(play()).toBeDisabled();

        const group = screen.getByRole('radiogroup', { name: 'Resource to monopolize' });
        await user.click(within(group).getByRole('radio', { name: 'Monopolize Wheat' }));

        expect(play()).toBeEnabled();
        await user.click(play());
        expect(onPlay).toHaveBeenCalledWith('monopoly', { monopolyResource: 'wheat' });
    });

    it('names a resource with the keyboard alone', async () => {
        const user = userEvent.setup();
        const { onPlay } = renderCard('monopoly');

        // Close button first, then the whole five-card group as one tab stop.
        await user.tab();
        expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('radio', { name: 'Monopolize Wood' })).toHaveFocus();

        await user.keyboard('{End}');
        expect(screen.getByRole('radio', { name: 'Monopolize Ore' })).toHaveFocus();

        await user.click(screen.getByRole('button', { name: 'Monopolize' }));
        expect(onPlay).toHaveBeenCalledWith('monopoly', { monopolyResource: 'ore' });
    });
});

describe('DevCardModal — cards without options', () => {
    it('passes no options for parameterless cards and surfaces a rejection', async () => {
        const user = userEvent.setup();
        const { onPlay, onClose } = renderCard(
            'knight',
            vi.fn().mockRejectedValue(new Error('Knight play rejected'))
        );

        await user.click(screen.getByRole('button', { name: 'Move Robber' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Knight play rejected');
        expect(onPlay).toHaveBeenCalledWith('knight', undefined);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('stays immediately playable when there is nothing to choose', () => {
        renderCard('victory_point');

        expect(screen.getByRole('button', { name: 'Reveal' })).toBeEnabled();
        expect(screen.queryByRole('group', { name: 'Resources to take' })).not.toBeInTheDocument();
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
});
