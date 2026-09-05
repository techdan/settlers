import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimDefenderProgressCard } from '@/app/actions';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { DefenderRewardModal } from '../DefenderRewardModal';
import { WaitingOverlay } from '../../modals/WaitingOverlay';

vi.mock('@/app/actions', () => ({ claimDefenderProgressCard: vi.fn() }));

const state = () => createTestGameState({
    players: ['Pa', 'Kaius', 'Dash'].map(id => createTestPlayer({ id, name: id })),
    currentTurn: 'Pa', phase: 'waiting_for_roll', pendingDefenderCardDraws: ['Pa', 'Kaius', 'Dash'],
    progressDecks: { science: ['alchemist'], trade: ['merchant'], politics: [] },
});

describe('Defender reward prompt', () => {
    beforeEach(() => { vi.mocked(claimDefenderProgressCard).mockReset(); });

    it('gives Pa an actionable deck choice without the blocking waiting overlay', async () => {
        const gameState = state();
        vi.mocked(claimDefenderProgressCard).mockResolvedValue(gameState);
        render(<><DefenderRewardModal gameState={gameState} playerId="Pa" /><WaitingOverlay gameState={gameState} currentPlayerId="Pa" /></>);
        expect(screen.queryByText('Waiting on Players')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Politics/ })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: /Science/ }));
        await waitFor(() => expect(claimDefenderProgressCard).toHaveBeenCalledWith('room-1', 'Pa', 'science'));
    });

    it('explains who chooses first to the other defenders', () => {
        render(<DefenderRewardModal gameState={state()} playerId="Dash" />);
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for Pa to choose');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('keeps failed choices available to retry', async () => {
        vi.mocked(claimDefenderProgressCard).mockRejectedValue(new Error('Please try again'));
        render(<DefenderRewardModal gameState={state()} playerId="Pa" />);
        fireEvent.click(screen.getByRole('button', { name: /Science/ }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Please try again');
        expect(screen.getByRole('button', { name: /Science/ })).toBeEnabled();
    });
});
