export interface ChatMessage {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: 'player' | 'system';
    createdAt: string;
}
