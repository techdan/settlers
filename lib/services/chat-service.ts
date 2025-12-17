import { randomUUID } from 'crypto';
import * as chatRepository from '@/lib/repositories/chat-repository';
import * as playerRepository from '@/lib/repositories/player-repository';

/**
 * Chat Service
 * Handles business logic for chat operations
 */

// Configuration constants
const MAX_MESSAGE_LENGTH = 280;
const MAX_LINES = 4;
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX_MESSAGES = 5;

export interface ChatMessage {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: 'player' | 'system';
    createdAt: string; // ISO string
}

export interface SendMessageResult {
    success: boolean;
    message?: ChatMessage;
    error?: string;
}

/**
 * Validate and normalize message content
 *
 * @param message - Raw message input
 * @returns Normalized message or null if invalid
 */
function normalizeMessage(message: string): string | null {
    // Trim whitespace
    let normalized = message.trim();

    // Reject empty messages
    if (normalized.length === 0) {
        return null;
    }

    // Enforce max length
    if (normalized.length > MAX_MESSAGE_LENGTH) {
        return null;
    }

    // Normalize line endings (CRLF -> LF)
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Limit to max lines
    const lines = normalized.split('\n');
    if (lines.length > MAX_LINES) {
        normalized = lines.slice(0, MAX_LINES).join('\n');
    }

    // Strip control characters (except newline and tab)
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return normalized;
}

/**
 * Send a chat message
 *
 * @param roomId - Room ID
 * @param playerId - Player ID sending the message
 * @param message - Message content
 * @param clientMessageId - Optional client-provided ID for deduplication
 * @returns Result with success status and message or error
 */
export async function sendChatMessage(
    roomId: string,
    playerId: string,
    message: string,
    clientMessageId?: string
): Promise<SendMessageResult> {
    // Validate message content
    const normalizedMessage = normalizeMessage(message);
    if (normalizedMessage === null) {
        return {
            success: false,
            error: 'Invalid message: empty or exceeds maximum length (280 characters)',
        };
    }

    // Verify player exists and belongs to room
    const player = await playerRepository.findPlayerById(playerId);
    if (!player) {
        return {
            success: false,
            error: 'Player not found',
        };
    }

    if (player.roomId !== roomId) {
        return {
            success: false,
            error: 'Player does not belong to this room',
        };
    }

    // Check for duplicate (if clientMessageId provided)
    if (clientMessageId) {
        const isDuplicate = await chatRepository.messageExistsByClientId(
            roomId,
            playerId,
            clientMessageId
        );
        if (isDuplicate) {
            // Return success without creating duplicate - idempotent behavior
            return {
                success: true,
                error: 'Message already sent (duplicate)',
            };
        }
    }

    // Rate limiting: max 5 messages per 10 seconds per player per room
    const recentCount = await chatRepository.countRecentMessagesByPlayer(
        roomId,
        playerId,
        RATE_LIMIT_WINDOW_MS
    );

    if (recentCount >= RATE_LIMIT_MAX_MESSAGES) {
        return {
            success: false,
            error: 'Too many messages. Please wait a moment.',
        };
    }

    // Insert message
    const messageId = randomUUID();
    const inserted = await chatRepository.insertChatMessage({
        id: messageId,
        roomId,
        playerId,
        message: normalizedMessage,
        messageType: 'player',
        clientMessageId,
    });

    return {
        success: true,
        message: {
            id: inserted.id,
            roomId: inserted.roomId,
            playerId: inserted.playerId,
            message: inserted.message,
            messageType: inserted.messageType as 'player' | 'system',
            createdAt: inserted.createdAt.toISOString(),
        },
    };
}

/**
 * Get recent messages for a room
 *
 * @param roomId - Room ID
 * @param limit - Max messages to return
 * @param beforeTimestamp - For pagination
 * @returns Array of chat messages
 */
export async function getRecentMessages(
    roomId: string,
    limit: number = 50,
    beforeTimestamp?: string
): Promise<ChatMessage[]> {
    const messages = await chatRepository.getRecentChatMessages(
        roomId,
        limit,
        beforeTimestamp ? new Date(beforeTimestamp) : undefined
    );

    return messages.map(m => ({
        id: m.id,
        roomId: m.roomId,
        playerId: m.playerId,
        message: m.message,
        messageType: m.messageType as 'player' | 'system',
        createdAt: m.createdAt.toISOString(),
    }));
}
