'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GameState } from '@/lib/types';

/**
 * Optimistic Game State Context
 *
 * Provides optimistic updates for immediate UI feedback when the current player
 * takes actions. Updates are applied immediately, then reconciled when server responds.
 *
 * Pattern:
 * 1. User action → Apply optimistic update → UI updates instantly
 * 2. Server action executes
 * 3. On success: Clear optimistic state (real state from polling will match)
 * 4. On error: Clear optimistic state + show error (rollback)
 */

interface OptimisticUpdate {
    id: string;
    timestamp: number;
    applyUpdate: (state: GameState) => GameState;
}

interface OptimisticGameStateContextType {
    applyOptimisticUpdate: (id: string, updateFn: (state: GameState) => GameState) => void;
    clearOptimisticUpdate: (id: string) => void;
    clearAllOptimisticUpdates: () => void;
    getOptimisticState: (baseState: GameState) => GameState;
    hasOptimisticUpdates: () => boolean;
}

const OptimisticGameStateContext = createContext<OptimisticGameStateContextType | null>(null);

export function OptimisticGameStateProvider({ children }: { children: ReactNode }) {
    const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());

    const applyOptimisticUpdate = useCallback((id: string, updateFn: (state: GameState) => GameState) => {
        setOptimisticUpdates(prev => {
            const next = new Map(prev);
            next.set(id, {
                id,
                timestamp: Date.now(),
                applyUpdate: updateFn
            });
            return next;
        });
    }, []);

    const clearOptimisticUpdate = useCallback((id: string) => {
        setOptimisticUpdates(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const clearAllOptimisticUpdates = useCallback(() => {
        setOptimisticUpdates(new Map());
    }, []);

    const getOptimisticState = useCallback((baseState: GameState): GameState => {
        if (optimisticUpdates.size === 0) return baseState;

        // Apply all optimistic updates in order
        let state = baseState;
        const updates = Array.from(optimisticUpdates.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        for (const update of updates) {
            state = update.applyUpdate(state);
        }

        return state;
    }, [optimisticUpdates]);

    const hasOptimisticUpdates = useCallback(() => {
        return optimisticUpdates.size > 0;
    }, [optimisticUpdates]);

    return (
        <OptimisticGameStateContext.Provider value={{
            applyOptimisticUpdate,
            clearOptimisticUpdate,
            clearAllOptimisticUpdates,
            getOptimisticState,
            hasOptimisticUpdates
        }}>
            {children}
        </OptimisticGameStateContext.Provider>
    );
}

export function useOptimisticGameState() {
    const context = useContext(OptimisticGameStateContext);
    if (!context) {
        throw new Error('useOptimisticGameState must be used within OptimisticGameStateProvider');
    }
    return context;
}

/**
 * Helper hook for performing optimistic actions
 *
 * @example
 * const performOptimisticAction = useOptimisticAction();
 *
 * await performOptimisticAction(
 *     'build-road-123',
 *     (state) => {
 *         // Apply optimistic update
 *         state.board.edges[edgeId].owner = playerId;
 *         return state;
 *     },
 *     async () => {
 *         // Server action
 *         return await buildRoad(roomId, playerId, edgeId);
 *     }
 * );
 */
export function useOptimisticAction() {
    const { applyOptimisticUpdate, clearOptimisticUpdate } = useOptimisticGameState();

    return useCallback(async <T,>(
        updateId: string,
        optimisticUpdateFn: (state: GameState) => GameState,
        serverAction: () => Promise<T>,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        // Apply optimistic update immediately
        applyOptimisticUpdate(updateId, optimisticUpdateFn);

        try {
            // Execute server action
            const result = await serverAction();

            // Success - clear optimistic update
            // (polling will bring in the real state)
            clearOptimisticUpdate(updateId);

            return result;
        } catch (error) {
            // Error - rollback optimistic update
            clearOptimisticUpdate(updateId);

            if (onError) {
                onError(error as Error);
            } else {
                console.error('Optimistic action failed:', error);
            }

            return null;
        }
    }, [applyOptimisticUpdate, clearOptimisticUpdate]);
}
