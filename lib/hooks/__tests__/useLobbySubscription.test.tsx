import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLobbySubscription } from '../useLobbySubscription';

const { subscribe, close } = vi.hoisted(() => ({ subscribe: vi.fn(), close: vi.fn() }));
vi.mock('@/lib/room-transport', () => ({ subscribeRoomResource: subscribe }));
const initialRoom = { id: 'ABCD', status: 'waiting', metadata: null };

describe('useLobbySubscription', () => {
    beforeEach(() => {
        subscribe.mockReset();
        close.mockReset();
        subscribe.mockReturnValue({ close });
    });
    it('retains initial data while connecting', () => {
        const { result } = renderHook(() => useLobbySubscription('ABCD', initialRoom, []));
        expect(result.current.isRealtime).toBe(false);
        expect(result.current.room).toEqual(initialRoom);
    });
    it('tracks connection state, applies authoritative players, and closes on unmount', () => {
        const { result, unmount } = renderHook(() => useLobbySubscription('ABCD', initialRoom, []));
        const callbacks = subscribe.mock.calls[0][2];
        act(() => {
            callbacks.status(true);
            callbacks.value({ room: { ...initialRoom, status: 'in_progress' }, players: [
                { id: 'p1', name: 'Alice', color: '#ff0000', isHost: true, joinedAt: '2026-10-17T00:00:00Z' },
            ] });
        });
        expect(result.current.isRealtime).toBe(true);
        expect(result.current.room.status).toBe('in_progress');
        expect(result.current.players[0]).toMatchObject({ id: 'p1', isHost: true, color: '#ff0000' });
        act(() => callbacks.status(false));
        expect(result.current.isRealtime).toBe(false);
        unmount();
        expect(close).toHaveBeenCalledOnce();
    });
});
