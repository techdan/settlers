import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { DEFAULT_TIMER_CONFIG } from '@/lib/types/timer';
import { CompactGameStatus } from '../CompactGameStatus';

const clock = vi.hoisted(() => ({ isActive: true, isPaused: false, timeRemaining: 75, timeLimit: 120, timeElapsed: 45 }));
vi.mock('@/lib/hooks/useTimerState', async importOriginal => ({
    ...await importOriginal<typeof import('@/lib/hooks/useTimerState')>(),
    useTimerState: () => clock,
}));

function fixture() {
    return { ...createTestGameState({
        players: [createTestPlayer({ id: 'a', name: 'Alice' }), createTestPlayer({ id: 'b', name: 'Bob' })],
        currentTurn: 'b', phase: 'main_phase',
    }), timerConfig: { ...DEFAULT_TIMER_CONFIG, enabled: true } };
}

describe('shared 3D player status', () => {
    beforeEach(() => { clock.isActive = true; clock.isPaused = false; });

    it('puts the numeric clock only on the active player card', () => {
        render(<CompactGameStatus gameState={fixture()} currentPlayerId="a" presentation="three" />);
        expect(screen.getByTestId('player-card-a')).not.toHaveTextContent('1:15');
        expect(screen.getByTestId('player-card-b')).toHaveTextContent('1:15');
        expect(screen.getAllByText('1:15')).toHaveLength(1);
    });

    it('keeps a paused clock visibly labeled on the active card', () => {
        clock.isPaused = true;
        render(<CompactGameStatus gameState={fixture()} currentPlayerId="a" presentation="three" />);
        expect(screen.getByTestId('player-card-b')).toHaveTextContent('1:15 · Paused');
    });

    it('keeps the existing Classic status as the default', () => {
        const { container } = render(<CompactGameStatus gameState={fixture()} currentPlayerId="a" />);
        expect(container.querySelector('[data-player-presentation="classic"]')).not.toBeNull();
        expect(screen.getByTestId('player-card-b')).not.toHaveTextContent('1:15');
        expect(screen.getByText('1:15')).toBeInTheDocument();
    });
});
