import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import { useTheftNotificationEffect } from '../useGameControllerEffects';

describe('useTheftNotificationEffect', () => {
    it('captures a recent robber theft for the robbed player', () => {
        const thief = createTestPlayer({ id: 'thief' });
        const victim = createTestPlayer({ id: 'victim' });
        const theft = {
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
        });
        const setTheftNotification = vi.fn();

        renderHook(() =>
            useTheftNotificationEffect(
                gameState,
                victim.id,
                { current: 0 },
                setTheftNotification
            )
        );

        expect(setTheftNotification).toHaveBeenCalledWith(theft);
    });
});
