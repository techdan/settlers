import { env } from 'cloudflare:workers';
import type { RoomFunction, RoomMethod, RoomService } from './room-commands';
import { decodeRoomResult } from './room-wire';

export function normalizeRoomId(value: string): string {
    if (typeof value !== 'string' || !/^[A-Za-z]{4}$/.test(value)) throw new Error('Invalid room code');
    return value.toUpperCase();
}

export async function callRoom<S extends RoomService, M extends RoomMethod<S>>(
    roomId: string, service: S, method: M, ...args: Parameters<RoomFunction<S, M>>
): Promise<Awaited<ReturnType<RoomFunction<S, M>>>> {
    const code = normalizeRoomId(roomId);
    const normalizedArgs: unknown[] = [...args];
    if (typeof normalizedArgs[0] === 'string') normalizedArgs[0] = code;
    const result = await env.ROOMS.getByName(code).execute(code, service, method, normalizedArgs);
    if (!result.ok) throw new Error(result.error);
    return decodeRoomResult(result.value) as Awaited<ReturnType<RoomFunction<S, M>>>;
}

export async function createDurableRoom(playerName: string): Promise<{ roomId: string; playerId: string }> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const bytes = crypto.getRandomValues(new Uint8Array(4));
        const code = Array.from(bytes, byte => String.fromCharCode(65 + byte % 26)).join('');
        const result = await env.ROOMS.getByName(code).create(code, playerName);
        if (result.ok) return result.value;
        if (result.error !== 'Room already exists') throw new Error(result.error);
    }
    throw new Error('Unable to allocate a room. Please try again.');
}
