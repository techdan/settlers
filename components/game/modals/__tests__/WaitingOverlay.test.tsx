import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaitingOverlay } from '../WaitingOverlay';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';

describe('WaitingOverlay', () => {
    it('does not cover the Alchemy selector for the player who revealed the event die', () => {
        const player = createTestPlayer({ id: 'p1', name: 'Pa' });
        const gameState = createTestGameState({
            players: [player],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
        });
        Object.assign(gameState, {
            pendingAlchemy: {
                playerId: 'p1',
                eventDieFace: 'science',
                revealedAt: 123,
            },
        });

        render(<WaitingOverlay gameState={gameState} currentPlayerId="p1" />);

        expect(screen.queryByRole('dialog', { name: 'Waiting on Players' })).not.toBeInTheDocument();
    });

    it('keeps the waiting state for a different blocking player', () => {
        const activePlayer = createTestPlayer({ id: 'p1', name: 'Pa' });
        const alchemyPlayer = createTestPlayer({ id: 'p2', name: 'Wu' });
        const gameState = createTestGameState({
            players: [activePlayer, alchemyPlayer],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
        });
        Object.assign(gameState, {
            pendingAlchemy: {
                playerId: 'p2',
                eventDieFace: 'science',
                revealedAt: 123,
            },
        });

        render(<WaitingOverlay gameState={gameState} currentPlayerId="p1" />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Waiting on Players' })).toBeInTheDocument();
        expect(screen.getByText(/Wu must choose the Alchemy production dice/i)).toBeInTheDocument();
    });
});
