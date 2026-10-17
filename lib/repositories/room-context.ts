import { AsyncLocalStorage } from 'node:async_hooks';

export interface RoomRecord {
    id: string;
    status: string;
    createdAt: Date;
    metadata: string | null;
}

export interface PlayerRecord {
    id: string;
    roomId: string;
    name: string;
    color: string | null;
    isHost: boolean;
    clerkUserId: string | null;
    joinedAt: Date;
}

export interface GameRecord {
    id: string;
    roomId: string;
    state: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MessageRecord {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: string;
    clientMessageId: string | null;
    createdAt: Date;
}

/** A private transaction snapshot. Never shared between concurrent requests. */
export interface RoomData {
    roomId: string;
    revision: number;
    room: RoomRecord | null;
    players: PlayerRecord[];
    game: GameRecord | null;
    messages: MessageRecord[];
}

const context = new AsyncLocalStorage<RoomData>();

export function withRoomData<T>(data: RoomData, operation: () => Promise<T>): Promise<T> {
    return context.run(data, operation);
}

export function roomData(roomId?: string): RoomData {
    const data = context.getStore();
    if (!data) throw new Error('Room repository used outside its execution boundary');
    if (roomId !== undefined && roomId !== data.roomId) {
        throw new Error('Cross-room access is forbidden');
    }
    return data;
}

export function emptyRoomData(roomId: string): RoomData {
    return { roomId, revision: 0, room: null, players: [], game: null, messages: [] };
}

/** Restore only schema-owned dates; game JSON remains untouched. */
export function decodeRoomData(json: string): RoomData {
    const data: RoomData = JSON.parse(json);
    if (data.room) data.room.createdAt = new Date(data.room.createdAt);
    for (const player of data.players) player.joinedAt = new Date(player.joinedAt);
    if (data.game) {
        data.game.createdAt = new Date(data.game.createdAt);
        data.game.updatedAt = new Date(data.game.updatedAt);
    }
    for (const message of data.messages) message.createdAt = new Date(message.createdAt);
    return data;
}
