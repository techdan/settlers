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
