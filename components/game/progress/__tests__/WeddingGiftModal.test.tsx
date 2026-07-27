import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { submitWeddingGiftsAction } from '@/app/actions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { WeddingGiftModal } from '../WeddingGiftModal';

vi.mock('@/app/actions', () => ({
    submitWeddingGiftsAction: vi.fn()
}));

const initiator = createTestPlayer({
    id: 'initiator',
    name: 'Initiator'
});

const giver = createTestPlayer({
    id: 'giver',
    name: 'Giver',
    resources: {
        wood: 2,
        brick: 0,
        sheep: 0,
        wheat: 0,
        ore: 0
    }
});

function createWeddingState(status: 'pending' | 'completed') {
    return createTestGameState({
        roomId: 'room-1',
        players: [initiator, giver],
        pendingWedding: {
            initiatorId: initiator.id,
            requests: [{
                playerId: giver.id,
                requiredCards: 2,
                status
            }]
        }
    });
}

describe('WeddingGiftModal', () => {
    it('can hide after the local request completes without changing hook order', () => {
        const { rerender } = render(
            <WeddingGiftModal
                gameState={createWeddingState('pending')}
                playerId={giver.id}
                roomId="room-1"
            />
        );

        expect(screen.getByText('Give 2 cards to Initiator')).toBeInTheDocument();

        expect(() => {
            rerender(
                <WeddingGiftModal
                    gameState={createWeddingState('completed')}
                    playerId={giver.id}
                    roomId="room-1"
                />
            );
        }).not.toThrow();
        expect(screen.queryByText('Give 2 cards to Initiator')).not.toBeInTheDocument();
    });

    it('submits the selected cards and surfaces a rejected action', async () => {
        const user = userEvent.setup();
        vi.mocked(submitWeddingGiftsAction).mockRejectedValue(
            new Error('Wedding gifts were rejected')
        );

        render(
            <WeddingGiftModal
                gameState={createWeddingState('pending')}
                playerId={giver.id}
                roomId="room-1"
            />
        );

        await user.click(screen.getByRole('button', { name: /Add one Wood/ }));
        await user.click(screen.getByRole('button', { name: /Add one Wood/ }));
        await user.click(screen.getByRole('button', { name: 'Give Cards' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Wedding gifts were rejected'
        );
        expect(submitWeddingGiftsAction).toHaveBeenCalledWith(
            'room-1',
            giver.id,
            [
                { type: 'resource', value: 'wood' },
                { type: 'resource', value: 'wood' }
            ]
        );
    });
});
