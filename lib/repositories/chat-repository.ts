import { roomData, type MessageRecord } from './room-context';
export type ChatMessageRecord = MessageRecord;

export async function insertChatMessage(data: {
    id: string; roomId: string; playerId: string | null; message: string;
    messageType: 'player' | 'system'; clientMessageId?: string;
}): Promise<ChatMessageRecord> {
    const state = roomData(data.roomId);
    const message = { ...data, clientMessageId: data.clientMessageId ?? null, createdAt: new Date() };
    state.messages.push(message);
    // Rooms are ephemeral; bound persisted chat history and reconnect payloads.
    if (state.messages.length > 1000) state.messages.splice(0, state.messages.length - 1000);
    return message;
}
export async function getRecentChatMessages(roomId: string, limit = 50, beforeTimestamp?: Date): Promise<ChatMessageRecord[]> {
    const messages = roomData(roomId).messages.filter(message => !beforeTimestamp || message.createdAt < beforeTimestamp);
    return messages.slice(-Math.max(1, Math.min(100, limit)));
}
export async function countRecentMessagesByPlayer(roomId: string, playerId: string, windowMs: number): Promise<number> {
    const start = Date.now() - windowMs;
    return roomData(roomId).messages.filter(message => message.playerId === playerId && message.createdAt.getTime() >= start).length;
}
export async function messageExistsByClientId(roomId: string, playerId: string, clientMessageId: string): Promise<boolean> {
    return roomData(roomId).messages.some(message => message.playerId === playerId && message.clientMessageId === clientMessageId);
}
