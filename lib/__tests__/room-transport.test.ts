import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeRoomResource } from '../room-transport';

class Socket {
    static instances: Socket[] = [];
    onopen?: () => void;
    onclose?: () => void;
    onmessage?: (event: { data: string }) => void;
    close = vi.fn(() => this.onclose?.());
    constructor() { Socket.instances.push(this); }
    changed() { this.onmessage?.({ data: '{"type":"changed"}' }); }
}
const subscriptions: Array<{ close(): void }> = [];
beforeEach(() => {
    vi.useFakeTimers();
    Socket.instances = [];
    vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ revision: 1 }) }));
});
afterEach(() => {
    subscriptions.splice(0).forEach(item => item.close());
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
describe('shared room notifications', () => {
    it('shares a connection, catches up after reconnect and releases the last subscriber', async () => {
        const value = vi.fn();
        const first = subscribeRoomResource('ABCD', '/api/game/ABCD', { value });
        const second = subscribeRoomResource('ABCD', '/api/chat/ABCD', { value });
        subscriptions.push(first, second);
        expect(Socket.instances).toHaveLength(1);
        const socket = Socket.instances[0];
        socket.onopen?.();
        await vi.advanceTimersByTimeAsync(0);
        socket.close();
        await vi.advanceTimersByTimeAsync(1000);
        expect(Socket.instances).toHaveLength(2);
        const reconnected = Socket.instances[1];
        reconnected.onopen?.();
        reconnected.changed();
        await vi.advanceTimersByTimeAsync(0);
        expect(value).toHaveBeenCalledTimes(4);
        first.close();
        expect(reconnected.close).not.toHaveBeenCalled();
        second.close();
        expect(reconnected.close).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(60_000);
        expect(Socket.instances).toHaveLength(2);
        subscriptions.length = 0;
    });

    it('coalesces notifications during a fetch and ignores results after cleanup', async () => {
        let resolve!: (value: Response) => void;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }) as Promise<Response>);
        const value = vi.fn();
        const subscription = subscribeRoomResource('EFGH', '/api/game/EFGH', { value });
        subscriptions.push(subscription);
        Socket.instances[0].changed();
        Socket.instances[0].changed();
        expect(fetch).toHaveBeenCalledTimes(1);
        resolve(new Response(JSON.stringify({ revision: 0 })));
        await vi.advanceTimersByTimeAsync(0);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(value.mock.calls.map(call => call[0].revision)).toEqual([0, 1]);
        subscription.close();
        await subscription.refresh();
        expect(fetch).toHaveBeenCalledTimes(2);
        subscriptions.length = 0;
    });
});
