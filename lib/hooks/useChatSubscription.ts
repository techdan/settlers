import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribeRoomResource } from '@/lib/room-transport';

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

export function useChatSubscription({ roomId, onNewMessage }: UseChatSubscriptionOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
    const seen = useRef(new Set<string>());
    const onNewMessageRef = useRef(onNewMessage);
    const refreshRef = useRef<() => void>(() => {});
    useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

    const notify = useCallback((message: ChatMessage) => {
        if (seen.current.has(message.id)) return;
        seen.current.add(message.id);
        onNewMessageRef.current?.(message);
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        notify(message);
        setMessages(previous => previous.some(item => item.id === message.id) ? previous :
            [...previous, message].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
    }, [notify]);

    useEffect(() => {
        seen.current = new Set();
        const subscription = subscribeRoomResource<ChatMessage[]>(roomId, `/api/chat/${roomId}`, {
            value: next => {
                next.forEach(notify);
                setMessages(next);
                setError(null);
            },
            status: setIsRealtimeEnabled,
            error: () => setError('Failed to load messages'),
            settled: () => setIsLoading(false),
        });
        refreshRef.current = () => { void subscription.refresh(); };
        return () => { subscription.close(); refreshRef.current = () => {}; };
    }, [roomId, notify]);

    return { messages, isLoading, error, isRealtimeEnabled, addMessage, refetch: () => refreshRef.current() };
}
