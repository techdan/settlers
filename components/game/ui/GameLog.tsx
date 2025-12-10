import React from 'react';
import { GameLogEntry, PlayerState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';

interface GameLogProps {
    logs: GameLogEntry[];
    players?: PlayerState[];
}

export const GameLog: React.FC<GameLogProps> = ({ logs, players }) => {
    // Reverse logs to show newest first
    const reversedLogs = [...logs].reverse();
    const resolvePlayerColor = (color?: string | null) => {
        if (!color) return null;
        return PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-0.5 text-xs scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pr-1">
                {logs.length === 0 && <div className="text-slate-500 italic px-1">Game started...</div>}
                {reversedLogs.map(log => {
                    const player = players?.find(p => p.id === log.playerId);
                    const timestamp = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                        <Tooltip
                            key={log.id}
                            content={<span className="text-xs">{timestamp}</span>}
                            placement="left"
                            className="w-full"
                        >
                            <div className="group flex items-start py-0.5 px-1 hover:bg-white/5 rounded transition-colors cursor-default w-full">
                                {/* Player Badge */}
                                <div
                                    className="w-1.5 h-1.5 rounded-full mr-2 mt-1 flex-shrink-0 shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                                    style={{ backgroundColor: resolvePlayerColor(player?.color) || 'var(--color-highlight-muted)' }}
                                />

                                {/* Message */}
                                <div className="text-slate-300 tracking-tight leading-snug break-words flex-1 text-left">
                                    {log.message}
                                </div>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
};
