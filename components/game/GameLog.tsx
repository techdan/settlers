import React, { useEffect, useRef } from 'react';
import { GameLogEntry } from '@/lib/game-types';

interface GameLogProps {
    logs: GameLogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ logs }) => {
    // Reverse logs to show newest first
    const reversedLogs = [...logs].reverse();

    return (
        <div className="bg-slate-900/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 flex flex-col h-full">
            <h3 className="text-sm font-bold mb-2 text-slate-300 uppercase tracking-wider flex-shrink-0">Game Log</h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pr-2">
                {logs.length === 0 && <div className="text-slate-500 italic">Game started...</div>}
                {reversedLogs.map(log => (
                    <div key={log.id} className="text-slate-300 border-b border-slate-800 pb-1 last:border-0">
                        <span className="text-slate-500 text-xs mr-2 block mb-0.5">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
