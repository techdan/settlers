import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestGameState } from '@/lib/test-utils';
import { useGameModalState } from '../useGameModalState';

describe('useGameModalState', () => {
    it('owns trade and game-over modal visibility', () => {
        const gameState = createTestGameState({
            phase: 'game_over',
            winner: 'player-1',
        });
        const { result } = renderHook(() => useGameModalState({
            baseGameState: gameState,
            gameState,
            playerId: 'player-1',
            getOptimisticState: state => state,
        }));

        expect(result.current.showGameOverModal).toBe(true);
        expect(result.current.showTrade).toBe(false);

        act(() => {
            result.current.closeGameOverModal();
            result.current.openTrade();
        });
        expect(result.current.showGameOverModal).toBe(false);
        expect(result.current.showTrade).toBe(true);

        act(() => result.current.closeTrade());
        expect(result.current.showTrade).toBe(false);
    });
});
