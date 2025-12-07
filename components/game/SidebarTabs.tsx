'use client';

import React, { useState } from 'react';
import { GameLog } from './GameLog';
import { DiceStatsPanel } from './DiceStatsPanel';
import { DiceStats, EventDieStats, GameLogEntry, PlayerState } from '@/lib/types';

interface SidebarTabsProps {
    logs: GameLogEntry[];
    diceStats?: DiceStats;
    eventDieStats?: EventDieStats;
    players?: PlayerState[];
}

type TabType = 'log' | 'chat' | 'stats';

/**
 * Tabbed content panel for the right sidebar.
 * Contains Log, Chat (placeholder), and Stats tabs.
 */
export const SidebarTabs: React.FC<SidebarTabsProps> = ({
    logs,
    diceStats,
    eventDieStats,
    players,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('log');

    const tabs: { id: TabType; label: string; disabled?: boolean }[] = [
        { id: 'log', label: 'Log' },
        { id: 'chat', label: 'Chat', disabled: true },
        { id: 'stats', label: 'Stats' },
    ];

    return (
        <div className="flex flex-col bg-slate-900/90 rounded-lg border border-slate-700 shadow-xl backdrop-blur-sm overflow-hidden text-neutral-200">
            {/* Tab Buttons */}
            <div className="flex border-b border-slate-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`
                            flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider
                            transition-colors cursor-pointer
                            ${activeTab === tab.id
                                ? 'bg-slate-700/80 text-white border-b-2 border-amber-500'
                                : tab.disabled
                                    ? 'text-slate-600 cursor-not-allowed'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }
                        `}
                        title={tab.disabled ? 'Coming soon' : undefined}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content - taller height with vertical scroll (30rem = 480px, 50% taller than h-80/20rem) */}
            <div className="h-[30rem] overflow-hidden flex flex-col">
                {activeTab === 'log' && (
                    <div className="h-full overflow-hidden p-2">
                        <GameLog logs={logs} players={players} />
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center text-slate-500">
                            <div className="text-2xl mb-2">💬</div>
                            <div className="text-sm">Chat coming soon</div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && diceStats && (
                    <div className="h-full overflow-y-auto p-2">
                        <DiceStatsPanel
                            stats={diceStats}
                            eventStats={eventDieStats}
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
