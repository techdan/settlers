type Listener = { changed: () => void; status: (connected: boolean) => void };
type Channel = { listeners: Set<Listener>; socket: WebSocket | null; retry?: ReturnType<typeof setTimeout>; stopped: boolean; connected: boolean };
const channels = new Map<string, Channel>();

/** One notification socket per room per tab, shared by lobby, game and chat. */
function subscribeRoom(roomId: string, listener: Listener) {
    let channel = channels.get(roomId);
    if (!channel) {
        channel = { listeners: new Set(), socket: null, stopped: false, connected: false };
        channels.set(roomId, channel);
        const current = channel;
        let attempts = 0;
        const connect = () => {
            if (current.stopped) return;
            const url = new URL(`/api/room/${encodeURIComponent(roomId)}/events`, window.location.href);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            const socket = new WebSocket(url);
            current.socket = socket;
            socket.onopen = () => {
                attempts = 0;
                current.connected = true;
                current.listeners.forEach(item => item.status(true));
            };
            socket.onmessage = event => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'changed') current.listeners.forEach(item => item.changed());
                } catch { /* Ignore malformed notifications; fetches remain authoritative. */ }
            };
            socket.onerror = () => socket.close();
            socket.onclose = () => {
                current.connected = false;
                current.listeners.forEach(item => item.status(false));
                if (!current.stopped) current.retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts++));
            };
        };
        connect();
    }
    channel.listeners.add(listener);
    listener.status(channel.connected);
    const current = channel;
    return () => {
        current.listeners.delete(listener);
        if (current.listeners.size === 0) {
            current.stopped = true;
            clearTimeout(current.retry);
            current.socket?.close();
            channels.delete(roomId);
        }
    };
}

/** Serialize refreshes so an older HTTP response cannot overwrite a newer one. */
export function subscribeRoomResource<T>(roomId: string, path: string, options: {
    value: (value: T) => void;
    status?: (connected: boolean) => void;
    error?: (error: Error) => void;
    settled?: () => void;
}) {
    let stopped = false;
    let running = false;
    let dirty = false;
    let connected = false;
    const controller = new AbortController();
    const refresh = async () => {
        if (stopped) return;
        if (running) { dirty = true; return; }
        running = true;
        do {
            dirty = false;
            try {
                const response = await fetch(path, { signal: controller.signal, cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to load room data');
                const value: T = await response.json();
                if (!stopped) options.value(value);
            } catch (error) {
                if (!stopped) options.error?.(error instanceof Error ? error : new Error('Connection failed'));
            } finally {
                if (!stopped) options.settled?.();
            }
        } while (dirty && !stopped);
        running = false;
    };
    const unsubscribe = subscribeRoom(roomId, {
        changed: () => { void refresh(); },
        status: value => { connected = value; options.status?.(value); },
    });
    void refresh();
    const polling = setInterval(() => { if (!connected) void refresh(); }, 5000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return {
        refresh,
        close() {
            if (stopped) return;
            stopped = true;
            controller.abort();
            clearInterval(polling);
            window.removeEventListener('focus', focus);
            unsubscribe();
        },
    };
}
