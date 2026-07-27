# Chat Feature Implementation Plan (Archived)

**Status:** Historical implementation plan; the feature is implemented in v2.1.

This document provides step-by-step implementation instructions for the chat feature based on the retained [chat-feature-spec.md](../../planning/chat-feature-spec.md).

## Overview

Implement a room-scoped, real-time chat feature in the existing right-sidebar panel. The chat supports Supabase Realtime when available with a polling fallback.

---

## Phase 1: Database Schema

### Step 1.1: Add `chat_messages` table to schema

**File:** `lib/db/schema.ts`

Add the following table definition after the existing `games` table:

```typescript
export const chatMessages = pgTable('chat_messages', {
    id: text('id').primaryKey(), // UUID
    roomId: text('room_id').references(() => rooms.id).notNull(),
    playerId: text('player_id').references(() => players.id), // nullable for system messages
    message: text('message').notNull(),
    messageType: text('message_type').notNull().default('player'), // 'player' | 'system'
    clientMessageId: text('client_message_id'), // for deduplication
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Step 1.2: Run database migration

After modifying the schema, push the changes to the database:

```bash
npx drizzle-kit push
```

### Step 1.3: Add database index (manual SQL)

Execute in Supabase SQL editor or via migration:

```sql
CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at);
```

---

## Phase 2: Repository Layer

### Step 2.1: Create `lib/repositories/chat-repository.ts`

Create a new file with the following content:

```typescript
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { eq, and, desc, lt, sql } from 'drizzle-orm';

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
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(
            and(
                eq(chatMessages.roomId, roomId),
                eq(chatMessages.playerId, playerId),
                sql`${chatMessages.createdAt} >= ${windowStart}`
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
```

### Step 2.2: Export from repository index

**File:** `lib/repositories/index.ts`

Add this export:

```typescript
export * as chatRepository from './chat-repository';
```

---

## Phase 3: Service Layer

### Step 3.1: Create `lib/services/chat-service.ts`

Create a new file with the following content:

```typescript
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
```

### Step 3.2: Add player lookup function to player-repository

**File:** `lib/repositories/player-repository.ts`

Add this function if it doesn't exist:

```typescript
/**
 * Find a player by ID
 *
 * @param playerId - Player ID to search for
 * @returns Player record or undefined if not found
 */
export async function findPlayerById(playerId: string) {
    return db.query.players.findFirst({
        where: eq(players.id, playerId),
    });
}
```

---

## Phase 4: Server Action

### Step 4.1: Add chat action to `app/actions.ts`

Add the following imports at the top of the file:

```typescript
import * as chatService from '@/lib/services/chat-service';
```

Add the following server action:

```typescript
export async function sendChatMessage(
    roomId: string,
    playerId: string,
    message: string,
    clientMessageId?: string
) {
    const result = await chatService.sendChatMessage(roomId, playerId, message, clientMessageId);

    if (result.success) {
        revalidatePath(`/room/${roomId}`);
    }

    return result;
}
```

---

## Phase 5: API Route (Polling Fallback)

### Step 5.1: Create `app/api/chat/[roomId]/route.ts`

Create the directory structure and file:

```typescript
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import * as chatService from '@/lib/services/chat-service';

/**
 * Generate ETag from messages array
 */
function generateETag(messages: unknown[]): string {
    const hash = createHash('sha256')
        .update(JSON.stringify(messages))
        .digest('hex')
        .substring(0, 16);
    return `"${hash}"`;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const before = url.searchParams.get('before') || undefined;

    const messages = await chatService.getRecentMessages(roomId, limit, before);

    // Generate ETag from messages
    const etag = generateETag(messages);

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
        return new NextResponse(null, {
            status: 304,
            headers: {
                'ETag': etag,
                'Cache-Control': 'no-cache',
            },
        });
    }

    return NextResponse.json(messages, {
        headers: {
            'ETag': etag,
            'Cache-Control': 'no-cache',
        },
    });
}
```

---

## Phase 6: Client Subscription Hook

### Step 6.1: Create `lib/hooks/useChatSubscription.ts`

Create a new file:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export interface ChatMessage {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: 'player' | 'system';
    createdAt: string;
}

interface UseChatSubscriptionOptions {
    roomId: string;
    onNewMessage?: (message: ChatMessage) => void;
}

const POLL_INTERVAL_MS = 2500; // 2.5 seconds

/**
 * Hook for subscribing to chat messages via Supabase Realtime or polling fallback
 */
export function useChatSubscription({ roomId, onNewMessage }: UseChatSubscriptionOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
    const lastEtagRef = useRef<string | null>(null);
    const onNewMessageRef = useRef(onNewMessage);

    // Keep callback ref updated
    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
    }, [onNewMessage]);

    // Fetch messages from API
    const fetchMessages = useCallback(async (useEtag = true) => {
        try {
            const headers: HeadersInit = {};
            if (useEtag && lastEtagRef.current) {
                headers['If-None-Match'] = lastEtagRef.current;
            }

            const response = await fetch(`/api/chat/${roomId}`, { headers });

            if (response.status === 304) {
                // Not modified, no update needed
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const etag = response.headers.get('ETag');
            if (etag) {
                lastEtagRef.current = etag;
            }

            const newMessages: ChatMessage[] = await response.json();

            setMessages(prevMessages => {
                // Find truly new messages for callback
                const prevIds = new Set(prevMessages.map(m => m.id));
                const addedMessages = newMessages.filter(m => !prevIds.has(m.id));

                // Notify about new messages
                addedMessages.forEach(msg => {
                    onNewMessageRef.current?.(msg);
                });

                return newMessages;
            });

            setError(null);
        } catch (err) {
            console.error('[useChatSubscription] Fetch error:', err);
            setError('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    }, [roomId]);

    // Add a new message to local state (for optimistic updates or realtime)
    const addMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => {
            // Check for duplicates
            if (prev.some(m => m.id === message.id)) {
                return prev;
            }

            // Insert in correct position by createdAt
            const newMessages = [...prev, message].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            return newMessages;
        });

        onNewMessageRef.current?.(message);
    }, []);

    useEffect(() => {
        const supabase = getSupabaseClient();
        let pollInterval: NodeJS.Timeout | null = null;

        // Initial fetch
        fetchMessages(false);

        if (supabase) {
            // Use Supabase Realtime
            setIsRealtimeEnabled(true);

            const channel = supabase
                .channel(`chat:${roomId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `room_id=eq.${roomId}`,
                    },
                    (payload) => {
                        if (payload.new) {
                            const newMsg: ChatMessage = {
                                id: payload.new.id,
                                roomId: payload.new.room_id,
                                playerId: payload.new.player_id,
                                message: payload.new.message,
                                messageType: payload.new.message_type,
                                createdAt: payload.new.created_at,
                            };
                            addMessage(newMsg);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            // Polling fallback
            setIsRealtimeEnabled(false);

            pollInterval = setInterval(() => {
                fetchMessages(true);
            }, POLL_INTERVAL_MS);

            return () => {
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
            };
        }
    }, [roomId, fetchMessages, addMessage]);

    return {
        messages,
        isLoading,
        error,
        isRealtimeEnabled,
        addMessage,
        refetch: () => fetchMessages(false),
    };
}
```

---

## Phase 7: Chat UI Components

### Step 7.1: Create `lib/types/chat.ts`

Create a types file for chat:

```typescript
export interface ChatMessage {
    id: string;
    roomId: string;
    playerId: string | null;
    message: string;
    messageType: 'player' | 'system';
    createdAt: string;
}
```

### Step 7.2: Create `components/game/ui/ChatPanel.tsx`

Create the main chat panel component:

```typescript
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatSubscription, ChatMessage } from '@/lib/hooks/useChatSubscription';
import { sendChatMessage } from '@/app/actions';
import { PlayerState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';

interface ChatPanelProps {
    roomId: string;
    playerId: string;
    players?: PlayerState[];
    onNewMessage?: () => void;
}

const SCROLL_THRESHOLD = 40; // pixels from bottom to trigger auto-scroll

export const ChatPanel: React.FC<ChatPanelProps> = ({
    roomId,
    playerId,
    players,
    onNewMessage,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);

    const messageListRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { messages, isLoading, error, isRealtimeEnabled, addMessage } = useChatSubscription({
        roomId,
        onNewMessage: useCallback((msg: ChatMessage) => {
            // Only show pill if user scrolled up and message is from someone else
            if (!isNearBottomRef.current && msg.playerId !== playerId) {
                setShowNewMessagesPill(true);
            }
            onNewMessage?.();
        }, [playerId, onNewMessage]),
    });

    // Resolve player color to CSS variable
    const resolvePlayerColor = (color?: string | null) => {
        if (!color) return null;
        return PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color;
    };

    // Get player info by ID
    const getPlayer = (id: string | null) => {
        if (!id) return null;
        return players?.find(p => p.id === id);
    };

    // Check if user is near bottom of scroll
    const checkIfNearBottom = useCallback(() => {
        const container = messageListRef.current;
        if (!container) return true;

        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    }, []);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        const container = messageListRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
            setShowNewMessagesPill(false);
        }
    }, []);

    // Handle scroll events
    const handleScroll = useCallback(() => {
        isNearBottomRef.current = checkIfNearBottom();
        if (isNearBottomRef.current) {
            setShowNewMessagesPill(false);
        }
    }, [checkIfNearBottom]);

    // Auto-scroll when new messages arrive (if near bottom)
    useEffect(() => {
        if (isNearBottomRef.current) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    // Initial scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [isLoading, scrollToBottom]);

    // Handle send message
    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || isSending) return;

        setIsSending(true);
        setSendError(null);

        // Generate client message ID for deduplication
        const clientMessageId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            const result = await sendChatMessage(roomId, playerId, trimmed, clientMessageId);

            if (result.success && result.message) {
                // Optimistically add to local state
                addMessage(result.message);
                setInputValue('');
                // Scroll to bottom after sending
                setTimeout(scrollToBottom, 50);
            } else {
                setSendError(result.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('[ChatPanel] Send error:', err);
            setSendError('Failed to send. Try again.');
        } finally {
            setIsSending(false);
        }
    };

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format timestamp for tooltip
    const formatTimestamp = (iso: string) => {
        return new Date(iso).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Realtime status indicator */}
            {!isRealtimeEnabled && (
                <div className="px-2 py-1 text-xs text-slate-500 bg-slate-800/50 border-b border-slate-700">
                    Realtime off (polling)
                </div>
            )}

            {/* Message list */}
            <div
                ref={messageListRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto space-y-0.5 text-xs scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent p-2"
            >
                {isLoading && (
                    <div className="text-slate-500 italic px-1">Loading messages...</div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="text-slate-500 italic px-1">No messages yet. Say hello!</div>
                )}

                {error && (
                    <div className="text-red-400 italic px-1">{error}</div>
                )}

                {messages.map((msg) => {
                    const player = getPlayer(msg.playerId);
                    const isSystem = msg.messageType === 'system';

                    return (
                        <Tooltip
                            key={msg.id}
                            content={<span className="text-xs">{formatTimestamp(msg.createdAt)}</span>}
                            placement="left"
                            className="w-full"
                        >
                            <div className="group flex items-start py-0.5 px-1 hover:bg-white/5 rounded transition-colors cursor-default w-full">
                                {/* Player color dot */}
                                <div
                                    className="w-1.5 h-1.5 rounded-full mr-2 mt-1.5 flex-shrink-0 shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                                    style={{
                                        backgroundColor: isSystem
                                            ? 'var(--color-highlight-muted)'
                                            : resolvePlayerColor(player?.color) || 'var(--color-highlight-muted)',
                                    }}
                                />

                                {/* Message content */}
                                <div className="flex-1 min-w-0">
                                    {/* Sender name */}
                                    <span className="font-semibold text-slate-200">
                                        {isSystem ? 'System' : player?.name || 'Unknown'}
                                    </span>
                                    <span className="text-slate-500 mx-1">·</span>
                                    {/* Message text - preserve newlines */}
                                    <span className="text-slate-300 break-words whitespace-pre-wrap">
                                        {msg.message}
                                    </span>
                                </div>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>

            {/* New messages pill */}
            {showNewMessagesPill && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={scrollToBottom}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-full shadow-lg cursor-pointer transition-colors"
                    >
                        New messages ↓
                    </button>
                </div>
            )}

            {/* Send error */}
            {sendError && (
                <div className="px-2 py-1 text-xs text-red-400 bg-red-900/20">
                    {sendError}
                </div>
            )}

            {/* Composer */}
            <div className="border-t border-slate-700 p-2">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message the table..."
                        disabled={isSending}
                        rows={1}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        style={{ minHeight: '32px', maxHeight: '80px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                    >
                        {isSending ? '...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};
```

---

## Phase 8: Update SidebarTabs Component

### Step 8.1: Modify `components/game/ui/SidebarTabs.tsx`

Replace the entire file with the updated version:

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { GameLog } from './GameLog';
import { DiceStatsPanel } from './DiceStatsPanel';
import { ChatPanel } from './ChatPanel';
import { DiceStats, EventDieStats, GameLogEntry, GameState, PlayerState } from '@/lib/types';

interface SidebarTabsProps {
    logs: GameLogEntry[];
    diceStats?: DiceStats;
    eventDieStats?: EventDieStats;
    players?: PlayerState[];
    gameState: GameState;
    roomId: string;
    playerId: string;
}

type TabType = 'log' | 'chat' | 'stats';

/**
 * Tabbed content panel for the right sidebar.
 * Contains Log, Chat, and Stats tabs.
 */
export const SidebarTabs: React.FC<SidebarTabsProps> = ({
    logs,
    diceStats,
    eventDieStats,
    players,
    gameState,
    roomId,
    playerId,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('log');
    const [unreadCount, setUnreadCount] = useState(0);

    // Handle new chat message notification
    const handleNewChatMessage = useCallback(() => {
        if (activeTab !== 'chat') {
            setUnreadCount(prev => prev + 1);
        }
    }, [activeTab]);

    // Handle tab change
    const handleTabChange = (tabId: TabType) => {
        setActiveTab(tabId);
        if (tabId === 'chat') {
            setUnreadCount(0);
        }
    };

    const tabs: { id: TabType; label: string; badge?: number }[] = [
        { id: 'log', label: 'Log' },
        { id: 'chat', label: 'Chat', badge: unreadCount > 0 ? unreadCount : undefined },
        { id: 'stats', label: 'Stats' },
    ];

    // Format badge display
    const formatBadge = (count: number) => {
        return count > 99 ? '99+' : count.toString();
    };

    return (
        <div className="flex flex-col bg-slate-900/90 rounded-lg border border-slate-700 shadow-xl backdrop-blur-sm overflow-hidden text-neutral-200">
            {/* Tab Buttons */}
            <div className="flex border-b border-slate-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`
                            flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider
                            transition-colors cursor-pointer relative
                            ${activeTab === tab.id
                                ? 'bg-slate-700/80 text-white border-b-2 border-amber-500'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }
                        `}
                    >
                        {tab.label}
                        {/* Unread badge */}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                                {formatBadge(tab.badge)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="h-[45vh] min-h-[16rem] max-h-[30rem] overflow-hidden flex flex-col relative">
                {activeTab === 'log' && (
                    <div className="h-full overflow-hidden p-2">
                        <GameLog logs={logs} players={players} />
                    </div>
                )}

                {activeTab === 'chat' && (
                    <ChatPanel
                        roomId={roomId}
                        playerId={playerId}
                        players={players}
                        onNewMessage={handleNewChatMessage}
                    />
                )}

                {activeTab === 'stats' && diceStats && (
                    <div className="h-full overflow-y-auto p-2">
                        <DiceStatsPanel
                            stats={diceStats}
                            eventStats={eventDieStats}
                            gameState={gameState}
                        />
                    </div>
                )}

                {activeTab === 'stats' && !diceStats && (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center text-slate-500">
                            <div className="text-sm">No dice stats yet</div>
                            <div className="text-xs text-slate-600">Roll the dice to see statistics</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
```

### Step 8.2: Update SidebarTabs usage in parent component

Find where `SidebarTabs` is used and add the required `roomId` and `playerId` props. Search for the file using:

```bash
grep -r "SidebarTabs" --include="*.tsx"
```

Update the component call to include:
```tsx
<SidebarTabs
    logs={...}
    diceStats={...}
    eventDieStats={...}
    players={...}
    gameState={...}
    roomId={roomId}      // ADD THIS
    playerId={playerId}  // ADD THIS
/>
```

---

## Phase 9: Testing Checklist

### Manual Testing Steps

1. **Database Setup**
   - [ ] Schema migration runs without errors
   - [ ] `chat_messages` table created with correct columns
   - [ ] Index created on `(room_id, created_at)`

2. **Basic Chat Functionality**
   - [ ] Chat tab is enabled (not disabled)
   - [ ] Empty state shows "No messages yet. Say hello!"
   - [ ] Can type message in composer
   - [ ] Enter key sends message
   - [ ] Shift+Enter creates newline
   - [ ] Send button disabled when input empty
   - [ ] Send button disabled while sending

3. **Message Display**
   - [ ] Messages show sender color dot (matching game log style)
   - [ ] Messages show sender name
   - [ ] Message text displays correctly
   - [ ] Timestamp appears in tooltip on hover
   - [ ] Messages in chronological order (oldest at top)

4. **Realtime/Polling**
   - [ ] With Supabase configured: messages appear instantly for all players
   - [ ] Without Supabase: "Realtime off (polling)" indicator shows
   - [ ] Polling fetches new messages every 2-3 seconds

5. **Scroll Behavior**
   - [ ] Initial load scrolls to bottom
   - [ ] New messages auto-scroll when at bottom
   - [ ] User can scroll up to read history
   - [ ] "New messages" pill appears when scrolled up and new message arrives
   - [ ] Clicking pill scrolls to bottom

6. **Unread Badge**
   - [ ] Badge appears on Chat tab when messages arrive while on different tab
   - [ ] Badge shows correct count (up to 99+)
   - [ ] Badge clears when Chat tab is opened

7. **Validation & Error Handling**
   - [ ] Empty messages rejected
   - [ ] Messages over 280 characters rejected
   - [ ] Rate limiting works (5 messages per 10 seconds)
   - [ ] Send failure shows error message
   - [ ] Input content preserved on failure

8. **Security**
   - [ ] Player must be in room to send message
   - [ ] Messages rendered as plain text (no HTML)
   - [ ] Sender identity from database, not client

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/repositories/chat-repository.ts` | Database operations for chat |
| `lib/services/chat-service.ts` | Business logic for chat |
| `lib/hooks/useChatSubscription.ts` | Client subscription hook |
| `lib/types/chat.ts` | TypeScript types for chat |
| `components/game/ui/ChatPanel.tsx` | Main chat UI component |
| `app/api/chat/[roomId]/route.ts` | Polling API endpoint |

### Files to Modify

| File | Changes |
|------|---------|
| `lib/db/schema.ts` | Add `chatMessages` table |
| `lib/repositories/index.ts` | Export chat repository |
| `lib/repositories/player-repository.ts` | Add `findPlayerById` if missing |
| `app/actions.ts` | Add `sendChatMessage` action |
| `components/game/ui/SidebarTabs.tsx` | Enable chat tab, add props, integrate ChatPanel |
| Parent of SidebarTabs | Pass `roomId` and `playerId` props |

---

## Implementation Order

1. Phase 1: Database schema (creates foundation)
2. Phase 2: Repository layer (data access)
3. Phase 3: Service layer (business logic)
4. Phase 4: Server action (API for mutations)
5. Phase 5: API route (polling endpoint)
6. Phase 6: Subscription hook (client data fetching)
7. Phase 7: Chat UI components
8. Phase 8: SidebarTabs integration
9. Phase 9: Testing

Each phase can be committed separately and tested incrementally.
