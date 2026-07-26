import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { DiscardModal } from '../DiscardModal';

vi.mock('@/app/actions', () => ({
    discardCards: vi.fn(),
}));

describe('DiscardModal surface', () => {
    it('keeps the board sharp while blocking interaction during a robber discard', () => {
        const player = createTestPlayer({
            resources: { wood: 4, brick: 4, sheep: 0, wheat: 0, ore: 0 },
        });
        const gameState = createTestGameState({
            players: [player],
            phase: 'discarding',
        });

        render(<DiscardModal gameState={gameState} playerId={player.id} />);

        const dialog = screen.getByRole('dialog', { name: 'Robber Attack!' });
        const backdrop = dialog.parentElement!;

        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(backdrop.className).toMatch(/bg-black/);
        expect(backdrop.className).not.toMatch(/backdrop-blur/);
        expect(backdrop.className).toMatch(/pointer-events-auto/);
    });
});
