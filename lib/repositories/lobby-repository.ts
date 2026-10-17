import { roomData } from './room-context';
import type { PlayerColor } from '@/lib/types/player';

export async function getRoomById(roomId: string) {
    return roomData(roomId).room;
}
export async function getRoomWithPlayers(roomId: string) {
    const room = await getRoomById(roomId);
    return room ? { ...room, players: await getPlayersByRoomIdOrdered(roomId) } : null;
}
export async function getPlayersByRoomIdOrdered(roomId: string) {
    return [...roomData(roomId).players].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
}
export async function updatePlayerColors(updates: Array<{ id: string; color: PlayerColor }>) {
    for (const update of updates) {
        const player = roomData().players.find(player => player.id === update.id);
        if (player) player.color = update.color;
    }
}
export async function updatePlayerHostFlags(updates: Array<{ id: string; isHost: boolean }>) {
    for (const update of updates) {
        const player = roomData().players.find(player => player.id === update.id);
        if (player) player.isHost = update.isHost;
    }
}
export async function updateRoomMetadata(roomId: string, metadata: string) {
    const room = roomData(roomId).room;
    if (!room) throw new Error('Room not found');
    room.metadata = metadata;
}
export async function setPlayerColor(playerId: string, color: PlayerColor) {
    const player = roomData().players.find(player => player.id === playerId);
    if (player) player.color = color;
}
