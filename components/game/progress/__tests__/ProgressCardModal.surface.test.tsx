import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProgressCardModal } from '../ProgressCardModal';
import {
    createTestBoard,
    createTestGameState,
    createTestPlayer,
    createTestVertex,
} from '@/lib/test-utils/test-helpers';

/**
 * Cards whose decision is about the board (Alchemy's dice, the monopolies)
 * must float above it, not blur it out. Cards that print everything they need
 * (Saboteur's opponent table) stay blocking. These assertions pin that split so
 * a future modal refactor can't silently drop a card back behind the scrim.
 */
function renderCard(
    cardType: Parameters<typeof ProgressCardModal>[0]['cardType'],
    gameOverrides: Parameters<typeof createTestGameState>[0] = {},
    playerOverrides: Parameters<typeof createTestPlayer>[0] = {}
) {
    const player = createTestPlayer({
        id: 'p1',
        name: 'Pa',
        victoryPoints: 3,
        ...playerOverrides,
    });
    const opponent = createTestPlayer({ id: 'p2', name: 'Wu', victoryPoints: 5 });
    const gameState = createTestGameState({
        players: [player, opponent],
        currentTurn: 'p1',
        phase: 'waiting_for_roll',
        ...gameOverrides,
    });
    Object.assign(gameState, gameOverrides);
    const onPlay = vi.fn();

    return {
        player,
        onPlay,
        ...render(
            <ProgressCardModal
                isOpen
                cardType={cardType}
                gameState={gameState}
                currentPlayer={player}
                onClose={vi.fn()}
                onPlay={onPlay}
            />
        ),
    };
}

describe('ProgressCardModal surfaces', () => {
    it('floats Alchemy above the board without a blurring scrim', () => {
        renderCard('alchemist');

        const dialog = screen.getByRole('dialog', { name: 'Alchemy' });
        // Non-blocking: the rest of the app stays reachable.
        expect(dialog).toHaveAttribute('aria-modal', 'false');

        const wrapper = dialog.parentElement!;
        expect(wrapper.className).not.toMatch(/backdrop-blur/);
        expect(wrapper.className).not.toMatch(/bg-black/);
        // Clicks fall through the wrapper to the hexes underneath.
        expect(wrapper.className).toMatch(/pointer-events-none/);
        expect(dialog.className).toMatch(/pointer-events-auto/);
    });

    it('keeps Saboteur blocking because its dialog prints the whole decision', () => {
        renderCard('saboteur');

        const dialog = screen.getByRole('dialog', { name: 'Sabotage' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog.parentElement!.className).toMatch(/backdrop-blur/);
    });

    it('requires the event die reveal before showing Alchemy production dice', async () => {
        const user = userEvent.setup();
        const { onPlay } = renderCard('alchemist');

        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Roll Event Die' }));

        expect(onPlay).toHaveBeenCalledWith('alchemist', { revealEventDie: true });
    });

    it('collapses to the header without losing the board-visible Alchemy controls', async () => {
        const user = userEvent.setup();
        renderCard('alchemist', {
            pendingAlchemy: { playerId: 'p1', eventDieFace: 'science', revealedAt: 123 },
            eventDieRoll: { face: 'science', timestamp: 123 },
        });

        expect(screen.getAllByRole('radio')).toHaveLength(12);
        await user.click(screen.getByRole('button', { name: 'Collapse Alchemy controls' }));

        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Expand Alchemy controls' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Expand Alchemy controls' }));

        expect(screen.getAllByRole('radio')).toHaveLength(12);
    });

    it('shows the locked event result before Alchemy dice and removes cancel', async () => {
        const user = userEvent.setup();
        const { onPlay } = renderCard('alchemist', {
            pendingAlchemy: { playerId: 'p1', eventDieFace: 'science', revealedAt: 123 },
            eventDieRoll: { face: 'science', timestamp: 123 },
        }, {
            improvements: { science: 2, trade: 0, politics: 0 },
        });

        // Six faces per die, two dice.
        expect(screen.getAllByRole('radio')).toHaveLength(12);
        expect(screen.getByText('science')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm Selection' })).toBeDisabled();
        expect(screen.queryByText(/Production roll/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Red Die 3' }));
        await user.click(screen.getByRole('radio', { name: 'Yellow Die 4' }));

        expect(screen.getByRole('radio', { name: 'Red Die 3' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText(/moves the robber/)).toBeInTheDocument();
        expect(screen.getByText(/you will receive a Science progress card/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm Selection' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Confirm Selection' }));

        expect(screen.getByText(/Confirm Alchemy selection: red 3 \+ yellow 4 = 7/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: 'Alchemy' }).className).toMatch(/max-h-\[calc\(100dvh-2rem\)\]/);
        expect(onPlay).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Change' }));

        expect(screen.getByRole('button', { name: 'Confirm Selection' })).toBeEnabled();
        expect(screen.queryByText(/Confirm Alchemy selection/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Confirm Selection' }));
        expect(screen.getByRole('button', { name: 'Resolve Alchemy' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Resolve Alchemy' }));

        expect(onPlay).toHaveBeenCalledWith('alchemist', {
            chosenDice1: 3,
            chosenDice2: 4,
        });
    });

    it('shows the resources and progress card the confirmed roll will produce', async () => {
        const user = userEvent.setup();
        renderCard('alchemist', {
            pendingAlchemy: { playerId: 'p1', eventDieFace: 'science', revealedAt: 123 },
            eventDieRoll: { face: 'science', timestamp: 123 },
            board: createTestBoard({
                hexes: [{
                    id: '0,0',
                    hex: { q: 0, r: 0, s: 0 },
                    terrain: 'forest',
                    numberToken: 6,
                }],
                vertices: [createTestVertex({ q: 0, r: 0, d: 0, owner: 'p1', structure: 'settlement' })],
            }),
        }, {
            improvements: { science: 2, trade: 0, politics: 0 },
        });

        await user.click(screen.getByRole('radio', { name: 'Red Die 3' }));
        await user.click(screen.getByRole('radio', { name: 'Yellow Die 3' }));
        await user.click(screen.getByRole('button', { name: 'Confirm Selection' }));

        expect(screen.getByText('1 wood')).toBeInTheDocument();
        expect(screen.getByText('none')).toBeInTheDocument();
        expect(screen.getByText('1 Science card')).toBeInTheDocument();
    });
});

/**
 * handlePlay's `default` branch now refuses cards this dialog never routes.
 * These pin the confirm-only cards, which carry no options and would be the
 * ones a too-greedy default would swallow.
 */
/**
 * The full routing table. ProgressCardHand opens this dialog for exactly these
 * eleven cards (CARDS_REQUIRING_PARAMETERS + CONFIRMATION_MODAL_CARDS); every
 * one is pinned to the surface it should get, so adding a card to — or dropping
 * one from — BOARD_VISIBLE_CARDS fails here rather than in a playtest.
 */
describe('every card that opens the dialog gets the right surface', () => {
    it.each([
        // Board-visible: the decision needs the hexes or your hand.
        ['alchemist', 'Alchemy', 'board-visible'],
        ['resource_monopoly', 'Resource Monopoly', 'board-visible'],
        ['trade_monopoly', 'Trade Monopoly', 'board-visible'],
        ['merchant_fleet', 'Merchant Fleet', 'board-visible'],
        ['irrigation', 'Irrigation', 'board-visible'],
        ['mining', 'Mining', 'board-visible'],
        // Blocking: the dialog prints everything the decision needs.
        ['saboteur', 'Sabotage', 'blocking'],
        ['wedding', 'Wedding', 'blocking'],
        ['encouragement', 'Encouragement', 'blocking'],
        ['espionage', 'Espionage', 'blocking'],
        ['guild_dues', 'Guild Dues', 'blocking'],
    ] as const)('renders %s (%s) as %s', (cardType, cardName, expectedSurface) => {
        renderCard(cardType);

        const dialog = screen.getByRole('dialog', { name: cardName });
        const isBoardVisible = expectedSurface === 'board-visible';

        expect(dialog).toHaveAttribute('aria-modal', String(!isBoardVisible));
        expect(/backdrop-blur/.test(dialog.parentElement!.className)).toBe(!isBoardVisible);
    });
});

describe('confirm-only cards still play', () => {
    it.each([
        ['encouragement', 'Activate'],
        ['wedding', 'Play Card'],
        ['saboteur', 'Play Card'],
        ['irrigation', 'Confirm'],
        ['mining', 'Confirm'],
    ] as const)('plays %s from its %s button', async (cardType, buttonLabel) => {
        const user = userEvent.setup();
        const { onPlay } = renderCard(cardType);

        await user.click(screen.getByRole('button', { name: buttonLabel }));

        expect(onPlay).toHaveBeenCalledWith(cardType, {});
        expect(screen.queryByText(/played on the board/)).not.toBeInTheDocument();
    });
});
