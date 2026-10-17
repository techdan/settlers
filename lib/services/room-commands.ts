import * as building from './building-service';
import * as chat from './chat-service';
import * as cityWalls from './city-walls-service';
import * as ckGame from './ck-game-service';
import * as debug from './debug-service';
import * as devCard from './devcard-service';
import * as game from './game-service';
import * as improvement from './improvement-service';
import * as knight from './knight-service';
import { LobbyService } from './lobby-service';
import * as progressCard from './progress-card-service';
import * as robber from './robber-service';
import * as timerRequest from './timer-request-service';
import * as trading from './trading-service';
import { findRoomById } from '@/lib/repositories/room-repository';
import { findGameByRoomId } from '@/lib/repositories/game-repository';

// Only the server-side binding can call this dispatcher; no public RPC endpoint.
export const roomServices = {
    building, chat, cityWalls, ckGame, debug, devCard, game, improvement,
    knight, lobby: LobbyService, progressCard, robber, timerRequest, trading,
    reads: {
        async room(roomId: string) {
            const room = await findRoomById(roomId);
            return room ? { room, players: await LobbyService.getPlayersWithColors(roomId) } : null;
        },
        game: findGameByRoomId,
    },
};

export type RoomService = keyof typeof roomServices;
export type RoomMethod<S extends RoomService> = {
    [K in keyof typeof roomServices[S]]: typeof roomServices[S][K] extends (...args: never[]) => unknown ? K : never
}[keyof typeof roomServices[S]] & string;
export type RoomFunction<S extends RoomService, M extends RoomMethod<S>> =
    Extract<typeof roomServices[S][M], (...args: never[]) => unknown>;

export async function dispatchRoomCommand(service: RoomService, method: string, args: unknown[]): Promise<unknown> {
    const target = roomServices[service];
    if (!target || !Object.hasOwn(target, method) || method === 'constructor') {
        throw new Error('Unknown room operation');
    }
    const operation: unknown = Reflect.get(target, method);
    if (typeof operation !== 'function') throw new Error('Unknown room operation');
    return Reflect.apply(operation, target, args);
}
