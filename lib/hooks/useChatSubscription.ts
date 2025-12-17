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

            // Poll as backup (less frequently) in case Realtime connection drops
            pollInterval = setInterval(() => {
                fetchMessages(true);
            }, POLL_INTERVAL_MS * 4); // Poll every 10 seconds as backup

            return () => {
                supabase.removeChannel(channel);
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
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
