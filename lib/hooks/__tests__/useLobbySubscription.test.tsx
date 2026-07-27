import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLobbySubscription } from '../useLobbySubscription';

const { getSupabaseClientMock } = vi.hoisted(() => ({
    getSupabaseClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    getSupabaseClient: getSupabaseClientMock,
}));

const initialRoom = {
    id: 'room-1',
    status: 'waiting',
    metadata: null,
};

describe('useLobbySubscription', () => {
    beforeEach(() => {
        getSupabaseClientMock.mockReset();
    });

    it('reports polling fallback when realtime is unavailable', () => {
        getSupabaseClientMock.mockReturnValue(null);

        const { result } = renderHook(() => useLobbySubscription(
            initialRoom.id,
            initialRoom,
            []
        ));

        expect(result.current.isRealtime).toBe(false);
        expect(result.current.room).toEqual(initialRoom);
    });

    it('derives realtime availability from the room and client', () => {
        const channel = {
            on: vi.fn(),
            subscribe: vi.fn(),
        };
        channel.on.mockReturnValue(channel);
        channel.subscribe.mockReturnValue(channel);

        const client = {
            channel: vi.fn(() => channel),
            removeChannel: vi.fn(),
        };
        getSupabaseClientMock.mockReturnValue(client);

        const { result, unmount } = renderHook(() => useLobbySubscription(
            initialRoom.id,
            initialRoom,
            []
        ));

        expect(result.current.isRealtime).toBe(true);
        expect(client.channel).toHaveBeenCalledTimes(2);

        unmount();
        expect(client.removeChannel).toHaveBeenCalledTimes(2);
    });
});
