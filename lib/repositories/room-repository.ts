import { roomData } from './room-context';

export async function findRoomById(roomId: string) {
    return roomData(roomId).room ?? undefined;
}
export const findRoomByCode = findRoomById;

export async function createRoom(code: string) {
    const data = roomData(code);
    if (data.room) throw new Error('Room already exists');
    data.room = { id: code, status: 'waiting', metadata: null, createdAt: new Date() };
    return data.room;
}

export async function updateRoomStatus(roomId: string, status: 'waiting' | 'in_progress' | 'finished') {
    const room = roomData(roomId).room;
    if (!room) throw new Error('Room not found');
    room.status = status;
    return room;
}

export async function deleteRoom(roomId: string) {
    const data = roomData(roomId);
    data.room = null;
    data.players = [];
    data.game = null;
    data.messages = [];
}
