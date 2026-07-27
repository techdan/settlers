import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { discardCards } from '@/app/actions';
import { DiscardModal } from '../DiscardModal';

vi.mock('@/app/actions', () => ({
    discardCards: vi.fn().mockResolvedValue(undefined),
}));

const cardRow = () => screen.getByRole('group', { name: 'Cards to discard' });

/** A hand of `total` cards forces a discard of floor(total / 2). */
function renderDiscard(options: {
    resources?: Partial<Record<'wood' | 'brick' | 'sheep' | 'wheat' | 'ore', number>>;
    commodities?: Partial<Record<'paper' | 'cloth' | 'coin', number>>;
} = {}) {
    const player = createTestPlayer({
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, ...options.resources },
        commodities: { paper: 0, cloth: 0, coin: 0, ...options.commodities },
    });
    const gameState = createTestGameState({ players: [player], phase: 'discarding' });

    render(<DiscardModal gameState={gameState} playerId={player.id} />);
    return { player, gameState };
}

describe('DiscardModal selection', () => {
    beforeEach(() => {
        vi.mocked(discardCards).mockClear();
    });

    it('only shows cards the player actually holds', () => {
        renderDiscard({ resources: { wood: 6, ore: 2 } });

        expect(within(cardRow()).getAllByRole('button')).toHaveLength(2);
        expect(within(cardRow()).getByRole('button', { name: /Discard one Wood/ })).toBeInTheDocument();
        expect(within(cardRow()).queryByRole('button', { name: /Discard one Sheep/ })).not.toBeInTheDocument();
    });

    it('counts down the hand you keep as you pick cards', async () => {
        const user = userEvent.setup();
        renderDiscard({ resources: { wood: 6, ore: 2 } });

        await user.click(within(cardRow()).getByRole('button', { name: /Discard one Wood/ }));

        expect(
            within(cardRow()).getByRole('button', { name: 'Discard one Wood, discarding 1 of 6' })
        ).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('stops at the required number and explains why', async () => {
        const user = userEvent.setup();
        renderDiscard({ resources: { wood: 6, ore: 2 } });

        // 8 cards → must discard 4.
        const wood = () => within(cardRow()).getByRole('button', { name: /Discard one Wood/ });
        for (let i = 0; i < 4; i++) await user.click(wood());

        expect(wood()).toBeDisabled();
        expect(wood()).toHaveAttribute('title', 'You have already chosen 4 cards');
        expect(within(cardRow()).getByRole('button', { name: /Discard one Ore/ })).toBeDisabled();
    });

    it('cannot pick more of a card than the player holds', async () => {
        const user = userEvent.setup();
        renderDiscard({ resources: { wood: 5, ore: 3 } });

        const ore = () => within(cardRow()).getByRole('button', { name: /Discard one Ore/ });
        for (let i = 0; i < 3; i++) await user.click(ore());

        expect(ore()).toBeDisabled();
        expect(ore()).toHaveAttribute('title', 'You have no more Ore to discard');
        expect(within(cardRow()).getByRole('button', { name: /Discard one Wood/ })).toBeEnabled();
    });

    it('puts a card back with the corner action', async () => {
        const user = userEvent.setup();
        renderDiscard({ resources: { wood: 6, ore: 2 } });

        await user.click(within(cardRow()).getByRole('button', { name: /Discard one Wood/ }));
        await user.click(within(cardRow()).getByRole('button', { name: 'Keep one Wood' }));

        expect(
            within(cardRow()).getByRole('button', { name: 'Discard one Wood, discarding 0 of 6' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Keep one Wood' })).not.toBeInTheDocument();
    });

    it('confirms only once the exact count is chosen, splitting resources from commodities', async () => {
        const user = userEvent.setup();
        renderDiscard({ resources: { wood: 5 }, commodities: { paper: 3 } });

        // 8 cards → must discard 4.
        const confirm = () => screen.getByRole('button', { name: 'Confirm Discard' });
        expect(confirm()).toBeDisabled();

        for (let i = 0; i < 3; i++) {
            await user.click(within(cardRow()).getByRole('button', { name: /Discard one Wood/ }));
        }
        expect(confirm()).toBeDisabled();

        await user.click(within(cardRow()).getByRole('button', { name: /Discard one Paper/ }));
        expect(confirm()).toBeEnabled();

        await user.click(confirm());

        expect(discardCards).toHaveBeenCalledWith(
            'room-1',
            'player-1',
            { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            { paper: 1, cloth: 0, coin: 0 }
        );
    });

    it('hides commodities during a Sabotage, which only takes resources', () => {
        const player = createTestPlayer({
            resources: { wood: 4, brick: 2, sheep: 0, wheat: 0, ore: 0 },
            commodities: { paper: 3, cloth: 0, coin: 0 },
        });
        const gameState = createTestGameState({
            players: [player],
            phase: 'discarding',
            discardContext: { type: 'sabotage', initiatorId: 'player-2', targetIds: [player.id] },
        });

        render(<DiscardModal gameState={gameState} playerId={player.id} />);

        expect(screen.getByRole('dialog', { name: 'Sabotage!' })).toBeInTheDocument();
        expect(within(cardRow()).queryByRole('button', { name: /Discard one Paper/ })).not.toBeInTheDocument();
        expect(within(cardRow()).getByRole('button', { name: /Discard one Wood/ })).toBeInTheDocument();
    });
});
