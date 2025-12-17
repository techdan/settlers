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
