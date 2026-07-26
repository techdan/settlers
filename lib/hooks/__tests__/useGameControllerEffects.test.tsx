import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { useTheftNotificationEffect } from '../useGameControllerEffects';
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
