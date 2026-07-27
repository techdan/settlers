import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import {
    useGameOverModalEffect,
    useSelectedCardAutoClear,
    useTheftNotificationEffect,
    useTurnSubmissionReset,
} from '../useGameControllerEffects';
import type { GameState, TheftEvent } from '@/lib/types';

describe('useTheftNotificationEffect', () => {
    it('captures a recent robber theft for the robbed player', async () => {
        const thief = createTestPlayer({ id: 'thief' });
        const victim = createTestPlayer({ id: 'victim' });
        const theft: TheftEvent = {
            id: 'theft-1',
            source: 'robber' as const,
            victimId: victim.id,
            thiefId: thief.id,
            items: [{ type: 'resource' as const, value: 'wheat' as const, count: 1 }],
            victims: [{
                victimId: victim.id,
                items: [{ type: 'resource' as const, value: 'wheat' as const, count: 1 }],
            }],
            timestamp: Date.now(),
        };
        const gameState = createTestGameState({
            players: [thief, victim],
            lastTheft: theft,
            theftEvents: [theft],
        });

        const { result } = renderHook(() => {
            const [notifications, setNotifications] = useState<TheftEvent[]>([]);
            const seenIds = useRef(new Set<string>());
            useTheftNotificationEffect(gameState, victim.id, seenIds, setNotifications);
            return notifications;
        });

        await waitFor(() => expect(result.current).toEqual([theft]));
    });

    it('queues same-timestamp thefts and dismisses them in FIFO order', async () => {
        const thief = createTestPlayer({ id: 'thief' });
        const victim = createTestPlayer({ id: 'victim' });
        const timestamp = Date.now();
        const first: TheftEvent = {
            id: 'theft-a',
            source: 'guild_dues',
            victimId: victim.id,
            thiefId: thief.id,
            items: [{ type: 'resource', value: 'wood', count: 1 }],
            victims: [{
                victimId: victim.id,
                items: [{ type: 'resource', value: 'wood', count: 1 }],
            }],
            timestamp,
        };
        const second: TheftEvent = {
            id: 'theft-b',
            source: 'espionage',
            victimId: victim.id,
            thiefId: thief.id,
            items: [{ type: 'progress_card', value: 'smith', count: 1 }],
            victims: [{
                victimId: victim.id,
                items: [{ type: 'progress_card', value: 'smith', count: 1 }],
            }],
            timestamp,
        };
        const gameState = createTestGameState({
            players: [thief, victim],
            lastTheft: second,
            theftEvents: [first, second],
        });

        const { result } = renderHook(
            ({ state }: { state: GameState }) => {
                const [notifications, setNotifications] = useState<TheftEvent[]>([]);
                const seenIds = useRef(new Set<string>());
                useTheftNotificationEffect(state, victim.id, seenIds, setNotifications);
                const dismiss = useCallback(
                    () => setNotifications(current => current.slice(1)),
                    []
                );
                return { notifications, dismiss };
            },
            { initialProps: { state: gameState } }
        );

        await waitFor(() => expect(result.current.notifications).toEqual([first, second]));

        act(() => result.current.dismiss());
        expect(result.current.notifications).toEqual([second]);
    });
});

describe('controller modal and selection effects', () => {
    it('resets turn submission only when the turn or phase requires it', async () => {
        const setTurnSubmitted = vi.fn();
        const activeMainPhase = createTestGameState({
            currentTurn: 'p1',
            phase: 'main_phase',
        });
        const { rerender } = renderHook(
            ({ state }: { state: GameState }) =>
                useTurnSubmissionReset(state, 'p1', setTurnSubmitted),
            { initialProps: { state: activeMainPhase } }
        );

        expect(setTurnSubmitted).not.toHaveBeenCalled();

        rerender({
            state: {
                ...activeMainPhase,
                phase: 'waiting_for_roll',
            },
        });

        await waitFor(() =>
            expect(setTurnSubmitted).toHaveBeenCalledExactlyOnceWith(false)
        );
    });

    it('opens the game-over modal when a winner appears', async () => {
        const setShowGameOverModal = vi.fn();
        const activeGame = createTestGameState({
            phase: 'main_phase',
            winner: null,
        });
        const { rerender } = renderHook(
            ({ state }: { state: GameState }) =>
                useGameOverModalEffect(state, setShowGameOverModal),
            { initialProps: { state: activeGame } }
        );

        expect(setShowGameOverModal).not.toHaveBeenCalled();

        rerender({
            state: {
                ...activeGame,
                winner: 'p1',
            },
        });

        await waitFor(() =>
            expect(setShowGameOverModal).toHaveBeenCalledExactlyOnceWith(true)
        );
    });

    it('clears a selected card only after its local follow-up state ends', async () => {
        const clearSelectedCard = vi.fn();
        const inactiveSelection: Parameters<
            typeof useSelectedCardAutoClear
        >[1] = {
            selectingHexForCard: null,
            selectingVertexForCard: null,
            selectingEdgeForCard: null,
            selectingCityForEngineer: false,
            selectingCityForMedicine: false,
            selectingCityForMetropolis: null,
            selectingKnightsForSmith: false,
            isCraneDialogOpen: false,
            treasonMode: null,
            isTreasonModalOpen: false,
        };
        const activeSelection: Parameters<
            typeof useSelectedCardAutoClear
        >[1] = {
            ...inactiveSelection,
            selectingHexForCard: 'merchant',
        };
        const { rerender } = renderHook(
            ({
                selection,
            }: {
                selection: Parameters<typeof useSelectedCardAutoClear>[1];
            }) =>
                useSelectedCardAutoClear(
                    'merchant',
                    selection,
                    clearSelectedCard
                ),
            { initialProps: { selection: activeSelection } }
        );

        expect(clearSelectedCard).not.toHaveBeenCalled();

        rerender({ selection: inactiveSelection });

        await waitFor(() =>
            expect(clearSelectedCard).toHaveBeenCalledOnce()
        );
    });

    it('keeps Road Building selected while its server-driven flow is active', () => {
        const clearSelectedCard = vi.fn();
        const inactiveSelection: Parameters<
            typeof useSelectedCardAutoClear
        >[1] = {
            selectingHexForCard: null,
            selectingVertexForCard: null,
            selectingEdgeForCard: null,
            selectingCityForEngineer: false,
            selectingCityForMedicine: false,
            selectingCityForMetropolis: null,
            selectingKnightsForSmith: false,
            isCraneDialogOpen: false,
            treasonMode: null,
            isTreasonModalOpen: false,
        };

        renderHook(() =>
            useSelectedCardAutoClear(
                'road_building_progress',
                inactiveSelection,
                clearSelectedCard
            )
        );

        expect(clearSelectedCard).not.toHaveBeenCalled();
    });
});
