import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    cancelCommercialHarbor,
    makeCommercialHarborOffers,
    playProgressCard,
    respondToCommercialHarbor,
} from '@/app/actions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { CommercialHarborInitiatorDialog } from '../CommercialHarborInitiatorDialog';
import { CommercialHarborModal } from '../CommercialHarborModal';

vi.mock('@/app/actions', () => ({
    cancelCommercialHarbor: vi.fn(),
    makeCommercialHarborOffers: vi.fn(),
    playProgressCard: vi.fn(),
    respondToCommercialHarbor: vi.fn(),
}));

const initiator = createTestPlayer({
    id: 'initiator',
    name: 'Initiator',
    resources: {
        wood: 1,
        brick: 0,
        sheep: 0,
        wheat: 0,
        ore: 0,
    },
});

const responder = createTestPlayer({
    id: 'responder',
    name: 'Responder',
    commodities: {
        paper: 1,
        cloth: 0,
        coin: 0,
    },
});

describe('Commercial Harbor dialog error handling', () => {
    beforeEach(() => {
        vi.mocked(playProgressCard).mockReset();
        vi.mocked(makeCommercialHarborOffers).mockReset();
        vi.mocked(cancelCommercialHarbor).mockReset();
        vi.mocked(respondToCommercialHarbor).mockReset();
        vi.mocked(playProgressCard).mockResolvedValue(
            createTestGameState({ players: [initiator, responder] })
        );
    });

    it('announces an offer-submission Error message', async () => {
        const user = userEvent.setup();
        vi.mocked(makeCommercialHarborOffers).mockRejectedValue(
            new Error('Offers were rejected')
        );

        render(
            <CommercialHarborInitiatorDialog
                gameState={createTestGameState({
                    players: [initiator, responder],
                })}
                playerId={initiator.id}
                roomId="room-1"
            />
        );

        await user.click(screen.getByRole('button', { name: /wood/i }));
        await user.click(screen.getByRole('button', { name: 'Make Offers' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Offers were rejected'
        );
        expect(makeCommercialHarborOffers).toHaveBeenCalledWith(
            'room-1',
            initiator.id,
            [{
                targetPlayerId: responder.id,
                offeredResource: 'wood',
            }]
        );
    });

    it('uses a safe fallback when cancellation rejects a non-Error', async () => {
        const user = userEvent.setup();
        vi.mocked(cancelCommercialHarbor).mockRejectedValue({ rejected: true });

        render(
            <CommercialHarborInitiatorDialog
                gameState={createTestGameState({
                    players: [initiator, responder],
                    pendingCommercialHarbor: {
                        initiatorId: initiator.id,
                        offers: [],
                    },
                })}
                playerId={initiator.id}
                roomId="room-1"
            />
        );

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to cancel'
        );
    });

    it('uses a safe fallback when a response rejects a non-Error', async () => {
        const user = userEvent.setup();
        vi.mocked(respondToCommercialHarbor).mockRejectedValue('rejected');

        render(
            <CommercialHarborModal
                gameState={createTestGameState({
                    players: [initiator, responder],
                    pendingCommercialHarbor: {
                        initiatorId: initiator.id,
                        offers: [{
                            targetPlayerId: responder.id,
                            offeredResource: 'wood',
                        }],
                    },
                })}
                playerId={responder.id}
                roomId="room-1"
            />
        );

        await user.click(screen.getByRole('button', { name: 'Confirm Trade' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to submit response'
        );
        expect(respondToCommercialHarbor).toHaveBeenCalledWith(
            'room-1',
            responder.id,
            'paper'
        );
    });
});
