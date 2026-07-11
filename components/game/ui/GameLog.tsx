'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameLogEntry, PlayerState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';

interface GameLogProps {
    logs: GameLogEntry[];
    players?: PlayerState[];
}

const NEAR_BOTTOM_PX = 48;

/**
 * Game log — chronological (oldest → newest), like the chat beside it, so
 * cause reads above effect ("rolled 6" above "received wheat"). Sticks to the
 * bottom while you're there; if you scroll up to read history, new entries
 * raise a pill instead of yanking the view (same pattern as ChatPanel).
 */
export const GameLog: React.FC<GameLogProps> = ({ logs, players }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const prevLenRef = useRef(logs.length);
    const [newEntriesPill, setNewEntriesPill] = useState(false);

    const isNearBottom = useCallback(() => {
        const c = listRef.current;
        if (!c) return true;
        return c.scrollHeight - c.scrollTop - c.clientHeight < NEAR_BOTTOM_PX;
    }, []);

    const scrollToBottom = useCallback((smooth: boolean) => {
        const c = listRef.current;
        if (!c) return;
        c.scrollTo({ top: c.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    // Start pinned to the latest entry
    useEffect(() => {
        scrollToBottom(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // New entries: follow if pinned, otherwise offer the pill
    useEffect(() => {
        if (logs.length === prevLenRef.current) return;
        prevLenRef.current = logs.length;
        if (isNearBottomRef.current) {
            scrollToBottom(true);
        } else {
            setNewEntriesPill(true);
        }
    }, [logs.length, scrollToBottom]);

    const handleScroll = () => {
        isNearBottomRef.current = isNearBottom();
        if (isNearBottomRef.current) setNewEntriesPill(false);
    };

    const resolvePlayerColor = (color?: string | null) => {
        if (!color) return null;
        return PLAYER_COLOR_VAR_MAP[(color?.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color;
    };

    return (
        <div className="relative flex flex-col h-full">
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto text-xs scrollbar-thin scrollbar-thumb-[#3d3226] scrollbar-track-transparent pr-1"
            >
                {logs.length === 0 && <div className="text-[var(--ui-muted)] italic px-1">Game started...</div>}
                {logs.map(log => {
                    const player = players?.find(p => p.id === log.playerId);
                    const playerColor = resolvePlayerColor(player?.color);
                    const isSystem = !player;
                    const timestamp = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    // Bold the acting player's name in their color when the
                    // message leads with it ("Pa placed a road").
                    const leadsWithName = !!player && log.message.startsWith(player.name);
                    const rest = leadsWithName ? log.message.slice(player!.name.length) : log.message;

                    if (isSystem) {
                        return (
                            <Tooltip key={log.id} content={<span className="text-xs">{timestamp}</span>} placement="left" className="w-full">
                                <div className="flex items-center gap-2 py-1 px-1 cursor-default w-full">
                                    <div className="h-px flex-1 bg-[var(--ui-border)]" />
                                    <div className="text-[var(--ui-muted)] italic text-[11px] text-center max-w-[85%] leading-snug">
                                        {log.message}
                                    </div>
                                    <div className="h-px flex-1 bg-[var(--ui-border)]" />
                                </div>
                            </Tooltip>
                        );
                    }

                    return (
                        <Tooltip key={log.id} content={<span className="text-xs">{timestamp}</span>} placement="left" className="w-full">
                            <div className="group flex items-start py-[3px] px-1 hover:bg-white/5 rounded transition-colors cursor-default w-full">
                                {/* Player color bar */}
                                <div
                                    className="w-[3px] self-stretch rounded-full mr-2 flex-shrink-0 opacity-80"
                                    style={{ backgroundColor: playerColor || 'var(--ui-border)' }}
                                />
                                <div className="text-[var(--ui-text)] tracking-tight leading-snug break-words flex-1 text-left">
                                    {leadsWithName ? (
                                        <>
                                            <span className="font-semibold" style={{ color: playerColor ?? undefined }}>
                                                {player!.name}
                                            </span>
                                            {rest}
                                        </>
                                    ) : (
                                        log.message
                                    )}
                                </div>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>

            {newEntriesPill && (
                <button
                    onClick={() => {
                        scrollToBottom(true);
                        setNewEntriesPill(false);
                    }}
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold shadow-lg cursor-pointer bg-[var(--ui-accent)] text-[var(--ui-accent-ink)] hover:brightness-110 transition"
                >
                    ↓ new events
                </button>
            )}
        </div>
    );
};
