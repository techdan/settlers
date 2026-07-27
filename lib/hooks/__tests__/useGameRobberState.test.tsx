import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState } from '@/lib/test-utils';
import type { GameState } from '@/lib/types';
import { useGameRobberState } from '../useGameRobberState';

describe('useGameRobberState', () => {
    it('hides a started prompt and shows a later robber placement', () => {
        const initialState = createTestGameState({
            currentTurn: 'player-1',
            phase: 'robber_placement',
            logs: [{
                id: 'robber-1',
                timestamp: 1,
                message: 'Move the robber',
            }],
        });
        const onGameStateUpdated = vi.fn();
        const { result, rerender } = renderHook(
            ({ gameState }: { gameState: GameState }) => useGameRobberState({
                gameState,
                roomId: 'room-1',
                playerId: 'player-1',
                onGameStateUpdated,
            }),
            { initialProps: { gameState: initialState } }
        );

        expect(result.current.showMovePrompt).toBe(true);
        act(() => result.current.handleMoveStarted());
        expect(result.current.showMovePrompt).toBe(false);

        rerender({
            gameState: {
                ...initialState,
                logs: [
                    ...initialState.logs,
                    {
                        id: 'robber-2',
                        timestamp: 2,
                        message: 'Move the robber again',
                    },
                ],
            },
        });
        expect(result.current.showMovePrompt).toBe(true);
    });
});
