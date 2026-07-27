import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimAqueductResource, respondToCommercialHarbor } from '@/app/actions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { AqueductModal } from '../AqueductModal';
import { CommercialHarborModal } from '../CommercialHarborModal';

vi.mock('@/app/actions', () => ({
    claimAqueductResource: vi.fn(),
    respondToCommercialHarbor: vi.fn(),
}));

const initiator = createTestPlayer({ id: 'initiator', name: 'Initiator' });

describe('AqueductModal', () => {
    beforeEach(() => {
        vi.mocked(claimAqueductResource).mockReset().mockResolvedValue(
            createTestGameState({ players: [createTestPlayer()] })
        );
    });

    const renderAqueduct = () => {
        const player = createTestPlayer({
            resources: { wood: 2, brick: 0, sheep: 1, wheat: 0, ore: 3 },
        });
        render(<AqueductModal gameState={createTestGameState({ players: [player] })} playerId={player.id} />);
        return player;
    };

    it('offers all five resources as a single-choice group with your holdings', () => {
        renderAqueduct();
        const group = screen.getByRole('radiogroup', { name: 'Resource to claim' });

        expect(within(group).getAllByRole('radio')).toHaveLength(5);
        expect(within(group).getByRole('radio', { name: 'Claim Ore, you have 3' })).toBeInTheDocument();
        // The bank always has stock, so nothing is ever unpickable here.
        within(group).getAllByRole('radio').forEach(radio => expect(radio).toBeEnabled());
    });

    it('claims the chosen resource', async () => {
        const user = userEvent.setup();
        const player = renderAqueduct();

        expect(screen.getByRole('button', { name: 'Claim Resource' })).toBeDisabled();

        await user.click(screen.getByRole('radio', { name: /Claim Brick/ }));
        expect(screen.getByRole('radio', { name: /Claim Brick/ })).toBeChecked();

        await user.click(screen.getByRole('button', { name: 'Claim Resource' }));
        expect(claimAqueductResource).toHaveBeenCalledWith('room-1', player.id, 'brick');
    });

    it('picks with the keyboard alone', async () => {
        const user = userEvent.setup();
        const player = renderAqueduct();

        await user.tab();
        await user.keyboard('{ArrowRight}{ArrowRight}');
        await user.click(screen.getByRole('button', { name: 'Claim Resource' }));

        // tab lands on the first card, two arrows move wood → brick → sheep
        expect(claimAqueductResource).toHaveBeenCalledWith('room-1', player.id, 'sheep');
    });

    it('explains a failed claim instead of silently resetting', async () => {
        const user = userEvent.setup();
        vi.mocked(claimAqueductResource).mockRejectedValue(new Error('Aqueduct already claimed'));
        renderAqueduct();

        await user.click(screen.getByRole('radio', { name: /Claim Wood/ }));
        await user.click(screen.getByRole('button', { name: 'Claim Resource' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Aqueduct already claimed');
    });
});

describe('CommercialHarborModal', () => {
    beforeEach(() => {
        vi.mocked(respondToCommercialHarbor).mockReset().mockResolvedValue(
            createTestGameState({ players: [initiator] })
        );
    });

    const renderHarbor = (commodities: { paper: number; cloth: number; coin: number }) => {
        const responder = createTestPlayer({ id: 'responder', name: 'Responder', commodities });
        render(
            <CommercialHarborModal
                gameState={createTestGameState({
                    players: [initiator, responder],
                    pendingCommercialHarbor: {
                        initiatorId: initiator.id,
                        offers: [{ targetPlayerId: responder.id, offeredResource: 'wood' }],
                    },
                })}
                playerId={responder.id}
                roomId="room-1"
            />
        );
        return responder;
    };

    it('disables commodities the player does not hold and says why', () => {
        renderHarbor({ paper: 2, cloth: 0, coin: 1 });
        const group = screen.getByRole('radiogroup', { name: 'Commodity to give' });

        const cloth = within(group).getByRole('radio', { name: 'Give Cloth, you have 0' });
        expect(cloth).toBeDisabled();
        expect(cloth).toHaveAttribute('title', 'You have no Cloth');
        expect(within(group).getByRole('radio', { name: 'Give Paper, you have 2' })).toBeEnabled();
    });

    it('skips the cards you lack when arrowing between choices', async () => {
        const user = userEvent.setup();
        const responder = renderHarbor({ paper: 2, cloth: 0, coin: 1 });

        await user.click(screen.getByRole('radio', { name: /Give Paper/ }));
        await user.keyboard('{ArrowRight}');
        await user.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        // paper → (cloth is empty) → coin
        expect(respondToCommercialHarbor).toHaveBeenCalledWith('room-1', responder.id, 'coin');
    });

    it('pre-selects the only commodity a player can give', async () => {
        const user = userEvent.setup();
        const responder = renderHarbor({ paper: 0, cloth: 3, coin: 0 });

        expect(screen.getByRole('radio', { name: /Give Cloth/ })).toBeChecked();

        await user.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        expect(respondToCommercialHarbor).toHaveBeenCalledWith('room-1', responder.id, 'cloth');
    });

    it('offers to return the resource when the player holds no commodities', async () => {
        const user = userEvent.setup();
        const responder = renderHarbor({ paper: 0, cloth: 0, coin: 0 });

        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        expect(screen.getByText(/no commodities/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Return Resource' }));
        expect(respondToCommercialHarbor).toHaveBeenCalledWith('room-1', responder.id, null);
    });
});
