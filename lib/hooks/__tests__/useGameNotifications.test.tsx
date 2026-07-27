import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { useGameNotifications } from '../useGameNotifications';

describe('useGameNotifications', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('owns the VP modal lifecycle for a recent local gain', () => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);
        const gameState = createTestGameState({
            lastVPCardGain: {
                playerId: 'player-1',
                cardType: 'printer',
                timestamp: 9_000,
            },
        });

        const { result } = renderHook(() =>
            useGameNotifications(gameState, 'player-1')
        );

        expect(result.current.vpCardModalType).toBe('printer');

        act(() => result.current.acknowledgeVPCard());
        expect(result.current.vpCardModalType).toBeNull();
    });

    it('queues and dismisses theft and trade notifications', () => {
        vi.useFakeTimers();
        vi.setSystemTime(20_000);
        const localPlayer = createTestPlayer({ id: 'player-1' });
        const otherPlayer = createTestPlayer({ id: 'player-2' });
        const theft = {
            id: 'theft-1',
            thiefId: otherPlayer.id,
            victimId: localPlayer.id,
            items: [{ type: 'resource' as const, value: 'wood' as const, count: 1 }],
            timestamp: 19_000,
        };
        const gameState = {
            ...createTestGameState({
            players: [localPlayer, otherPlayer],
            lastTheft: theft,
            theftEvents: [theft],
            }),
            lastTrade: {
                initiatorId: localPlayer.id,
                acceptorId: otherPlayer.id,
                initiatorGave: {
                    resources: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                },
                initiatorReceived: {
                    resources: { wood: 0, brick: 1, sheep: 0, wheat: 0, ore: 0 },
                },
                timestamp: 19_500,
            },
        };

        const { result } = renderHook(() =>
            useGameNotifications(gameState, localPlayer.id)
        );

        expect(result.current.theftNotification?.id).toBe('theft-1');
        expect(result.current.showTradeCompletion).toBe(true);

        act(() => {
            result.current.dismissTheftNotification();
            result.current.dismissTradeCompletion();
        });
        expect(result.current.theftNotification).toBeNull();
        expect(result.current.showTradeCompletion).toBe(false);
    });
});
