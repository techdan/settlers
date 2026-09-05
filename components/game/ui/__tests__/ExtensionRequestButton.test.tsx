import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionRequestButton } from '../ExtensionRequestButton';
import { createTestGameState } from '@/lib/test-utils/test-helpers';
import { requestExtension } from '@/lib/services/timer-service';
import type { GameState } from '@/lib/types/game';

describe('ExtensionRequestButton', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
    afterEach(() => { vi.useRealTimers(); });

    it('enables at expiry and disables again after extra time is granted', () => {
        const state: GameState = {
            ...createTestGameState(),
            timerConfig: { enabled: true, turnTimeLimit: 120, timeBank: 300, maxExtensionsPerTurn: 3, maxExtraSecondsPerTurn: 180, extensionIncrement: 60 },
            turnStartTime: Date.now() - 119_000,
            playerTimeBanks: { 'player-1': 300 },
        };
        const playerId = state.currentTurn;
        state.playerTimeBanks = { [playerId]: 300 };
        const request = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(<ExtensionRequestButton gameState={state} playerId={playerId} onRequestExtension={request} />);
        const button = screen.getByRole('button', { name: 'Request more time' });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(request).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(1000); });
        expect(button).toBeEnabled();
        const extended = requestExtension(state, playerId);
        expect(extended.success).toBe(true);
        rerender(<ExtensionRequestButton gameState={extended.newState!} playerId={playerId} onRequestExtension={request} />);
        expect(button).toBeDisabled();
        expect(requestExtension(extended.newState!, playerId).success).toBe(false);
    });
});
