import { DurableObject } from 'cloudflare:workers';
import { RoomExecution } from '@/lib/services/room-execution';
import { dispatchRoomCommand, type RoomService } from '@/lib/services/room-commands';
import { LobbyService } from '@/lib/services/lobby-service';
import { roomData, type RoomData } from '@/lib/repositories/room-context';
import { encodeRoomResult } from '@/lib/services/room-wire';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export class GameRoom extends DurableObject<Cloudflare.Env> {
    private execution?: RoomExecution;
    private roomId?: string;

    constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
        super(ctx, env);
        ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)');
    }

    private runner(code: string) {
        if (!/^[A-Z]{4}$/.test(code)) throw new Error('Invalid room code');
        if (this.roomId && this.roomId !== code) throw new Error('Room identity mismatch');
        this.roomId = code;
        return this.execution ??= new RoomExecution(code, {
            read: () => this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM room_state WHERE id = 1').toArray()[0]?.data ?? null,
            write: data => { this.ctx.storage.sql.exec('INSERT INTO room_state (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', data); },
        });
    }

    private publish(data: RoomData) {
        const message = JSON.stringify({ type: 'changed', revision: data.revision });
        for (const socket of this.ctx.getWebSockets()) {
            try { socket.send(message); } catch { /* A disconnected peer catches up on reconnect. */ }
        }
    }

    async create(code: string, playerName: string): Promise<Result<{ roomId: string; playerId: string }>> {
        try {
            const value = await this.runner(code).run(() => LobbyService.createRoom(playerName, code), data => this.publish(data));
            return { ok: true, value };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'Unable to create room' };
        }
    }

    async execute(code: string, service: RoomService, method: string, args: unknown[]): Promise<Result<string>> {
        try {
            if (args[0] !== code || (service === 'lobby' && method === 'createRoom')) throw new Error('Invalid room operation');
            const value = await this.runner(code).run(() => dispatchRoomCommand(service, method, args), data => this.publish(data));
            return { ok: true, value: encodeRoomResult(value) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'Room operation failed' };
        }
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const code = url.pathname.split('/').at(-2) ?? '';
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
        return this.runner(code).run(async () => {
            const data = roomData();
            if (!data.room) return new Response('Room not found', { status: 404 });
            if (this.ctx.getWebSockets().length >= 64) return new Response('Room connection limit reached', { status: 429 });
            const pair = new WebSocketPair();
            this.ctx.acceptWebSocket(pair[1]);
            pair[1].send(JSON.stringify({ type: 'changed', revision: data.revision }));
            return new Response(null, { status: 101, webSocket: pair[0] });
        });
    }

    webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
        if (message === 'ping') socket.send('pong');
        else socket.close(1008, 'Notifications only');
    }

    webSocketClose(socket: WebSocket, code: number) { socket.close(code, 'Connection closed'); }
}
