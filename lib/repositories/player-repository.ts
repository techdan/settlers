import { roomData } from './room-context';

export async function findPlayerById(playerId: string) {
    return roomData().players.find(player => player.id === playerId);
}
export async function findPlayersByRoomId(roomId: string) {
    return [...roomData(roomId).players];
}
export async function findPlayerByName(roomId: string, name: string) {
    return roomData(roomId).players.find(player => player.name === name);
}
export async function createPlayer(id: string, roomId: string, name: string, isHost = false) {
    const data = roomData(roomId);
    if (!data.room) throw new Error('Room not found');
    if (data.players.some(player => player.id === id)) throw new Error('Player already exists');
    const player = { id, roomId, name, isHost, color: null, clerkUserId: null, joinedAt: new Date() };
    data.players.push(player);
    return player;
}
export async function deletePlayer(playerId: string) {
    const data = roomData();
    data.players = data.players.filter(player => player.id !== playerId);
}
export async function deletePlayersByRoomId(roomId: string) {
    roomData(roomId).players = [];
}
export async function countPlayersInRoom(roomId: string): Promise<number> {
    return roomData(roomId).players.length;
}
