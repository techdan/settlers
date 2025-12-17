import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { eq, and, desc, lt, sql, gte } from 'drizzle-orm';

/**
 * Chat Repository
 * Handles all database operations for chat messages
 */

export interface ChatMessageRecord {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: string;
    clientMessageId: string | null;
    createdAt: Date;
}

/**
 * Insert a new chat message
 *
 * @param data - Message data to insert
 * @returns Inserted message record
 */
export async function insertChatMessage(data: {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: 'player' | 'system';
    clientMessageId?: string;
}): Promise<ChatMessageRecord> {
    const [inserted] = await db.insert(chatMessages)
        .values({
            id: data.id,
            roomId: data.roomId,
            playerId: data.playerId,
            message: data.message,
            messageType: data.messageType,
            clientMessageId: data.clientMessageId ?? null,
            createdAt: new Date(),
        })
        .returning();

    return inserted;
}

/**
 * Get recent chat messages for a room
 *
 * @param roomId - Room ID to fetch messages for
 * @param limit - Maximum number of messages to return (default 50)
 * @param beforeTimestamp - Optional timestamp for pagination (fetch messages before this time)
 * @returns Array of chat messages ordered by created_at ascending (oldest first)
 */
export async function getRecentChatMessages(
    roomId: string,
    limit: number = 50,
    beforeTimestamp?: Date
): Promise<ChatMessageRecord[]> {
    const conditions = [eq(chatMessages.roomId, roomId)];

    if (beforeTimestamp) {
        conditions.push(lt(chatMessages.createdAt, beforeTimestamp));
    }

    const messages = await db.query.chatMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(chatMessages.createdAt)],
        limit,
    });

    // Return in chronological order (oldest first)
    return messages.reverse();
}

/**
 * Count recent messages by a player within a time window (for rate limiting)
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param windowMs - Time window in milliseconds
 * @returns Number of messages sent in the window
 */
export async function countRecentMessagesByPlayer(
    roomId: string,
    playerId: string,
    windowMs: number
): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs);

    const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(
            and(
                eq(chatMessages.roomId, roomId),
                eq(chatMessages.playerId, playerId),
                gte(chatMessages.createdAt, windowStart)
            )
        );

    return Number(result[0]?.count ?? 0);
}

/**
 * Check if a message with the given client ID already exists (for deduplication)
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param clientMessageId - Client-provided message ID
 * @returns True if message exists
 */
export async function messageExistsByClientId(
    roomId: string,
    playerId: string,
    clientMessageId: string
): Promise<boolean> {
    const existing = await db.query.chatMessages.findFirst({
        where: and(
            eq(chatMessages.roomId, roomId),
            eq(chatMessages.playerId, playerId),
            eq(chatMessages.clientMessageId, clientMessageId)
        ),
    });

    return existing !== undefined;
}
