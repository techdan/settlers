import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProgressCardHand } from '../ProgressCardHand';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';

/**
 * A rejected card play used to reach console.error only, so clicking an
 * unplayable card silently did nothing. The hand gates what it can see locally,
 * but the server stays authoritative — anything it refuses must be visible.
 */

type OnPlayCard = ComponentProps<typeof ProgressCardHand>['onPlayCard'];

const renderHand = (onPlayCard: OnPlayCard) => {
    // Constitution plays directly with no follow-up modal, which is the
    // path that silently swallowed errors.
    const player = createTestPlayer({
        id: 'p1',
        name: 'Player 1',
        progressCards: ['constitution'],
    });

    const gameState = createTestGameState({
        roomId: 'room-1',
        gameMode: 'cities_and_knights',
        hasBarbariansAttacked: true,
        currentTurn: 'p1',
        phase: 'main_phase',
        players: [player, createTestPlayer({ id: 'p2', name: 'Player 2' })],
    });

    return render(
        <ProgressCardHand
            player={player}
            roomId="room-1"
            gameState={gameState}
            isActiveTurn
            onPlayCard={onPlayCard}
        />
    );
};

describe('ProgressCardHand error surfacing', () => {
    it('shows the server message when a card play is rejected', async () => {
        const user = userEvent.setup();
        const onPlayCard = vi.fn().mockRejectedValue(new Error('Not enough resources'));

        renderHand(onPlayCard);
        await user.click(screen.getByRole('button', { name: /constitution/i }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Not enough resources');
    });

    it('substitutes a readable message when the server message is redacted', async () => {
        const user = userEvent.setup();
        // What Next actually hands the client from a thrown server action in a
        // production build.
        const onPlayCard = vi.fn().mockRejectedValue(
            new Error(
                'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.'
            )
        );

        renderHand(onPlayCard);
        await user.click(screen.getByRole('button', { name: /constitution/i }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('could not be played right now');
        expect(alert).not.toHaveTextContent('omitted in production');
    });

    it('can be dismissed', async () => {
        const user = userEvent.setup();
        const onPlayCard = vi.fn().mockRejectedValue(new Error('Nope'));

        renderHand(onPlayCard);
        await user.click(screen.getByRole('button', { name: /constitution/i }));
        await screen.findByRole('alert');

        await user.click(screen.getByRole('button', { name: 'Dismiss error' }));

        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    it('stays quiet when the play succeeds', async () => {
        const user = userEvent.setup();
        const onPlayCard = vi.fn().mockResolvedValue(undefined);

        renderHand(onPlayCard);
        await user.click(screen.getByRole('button', { name: /constitution/i }));

        await waitFor(() => expect(onPlayCard).toHaveBeenCalled());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
