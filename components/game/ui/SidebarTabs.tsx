'use client';

import React, { useState, useCallback } from 'react';
import { GameLog } from './GameLog';
import { DiceStatsPanel } from './DiceStatsPanel';
import { ChatPanel } from './ChatPanel';
import { DiceStats, EventDieStats, GameLogEntry, GameState, PlayerState } from '@/lib/types';
import { useChatSubscription } from '@/lib/hooks/useChatSubscription';

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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const tabBarRef = React.useRef<HTMLDivElement>(null);
    const [tabBarHeight, setTabBarHeight] = useState<number>(44);

    // Handle new chat message notification
    const handleNewChatMessage = useCallback(() => {
        if (activeTab !== 'chat' || isCollapsed) {
            setUnreadCount(prev => {
                const newCount = prev + 1;
                console.log('[SidebarTabs] New chat message, incrementing badge:', newCount);
                return newCount;
            });
        } else {
            console.log('[SidebarTabs] New chat message ignored (chat tab active and expanded)');
        }
    }, [activeTab, isCollapsed]);

    // Subscribe to chat at the parent level so we get notifications even when not on chat tab
    const { messages, isLoading, error, isRealtimeEnabled, addMessage } = useChatSubscription({
        roomId,
        onNewMessage: handleNewChatMessage,
    });

    // Measure tab bar height for collapse target
    React.useEffect(() => {
        const measure = () => {
            if (tabBarRef.current) {
                setTabBarHeight(tabBarRef.current.getBoundingClientRect().height || 44);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Handle tab change and collapse toggle
    const handleTabClick = (tabId: TabType) => {
        if (tabId === activeTab) {
            setIsCollapsed(prev => !prev);
        } else {
            setActiveTab(tabId);
            setIsCollapsed(false);
        }

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
        <div
            className="flex flex-col bg-[var(--ui-panel)] rounded-lg border border-[var(--ui-border)] shadow-xl backdrop-blur-sm overflow-hidden text-[var(--ui-text)] transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: isCollapsed ? tabBarHeight : '30rem' }}
        >
            {/* Tab Buttons (always at top when expanded) */}
            <div
                ref={tabBarRef}
                className="flex border-b border-[var(--ui-border)] transition-transform duration-300 ease-in-out"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`
                            flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider
                            transition-colors cursor-pointer relative flex items-center justify-center gap-1.5
                            ${activeTab === tab.id
                                ? 'bg-[var(--ui-panel-raised)] text-[var(--ui-text)] border-b-2 border-[var(--ui-accent)]'
                                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-panel-solid)]/50 hover:text-[var(--ui-text)]'
                            }
                        `}
                    >
                        <span>{tab.label}</span>
                        {/* Unread badge */}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 bg-[var(--ui-accent)] text-[var(--ui-accent-ink)] text-[10px] font-bold rounded-full flex items-center justify-center">
                                {formatBadge(tab.badge)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out flex flex-col relative ${isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[30rem] opacity-100'}`}
            >
                <div className={`h-[45vh] ${isCollapsed ? '' : 'min-h-[16rem]'} max-h-[30rem] flex flex-col`}>
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
                            messages={messages}
                            isLoading={isLoading}
                            error={error}
                            isRealtimeEnabled={isRealtimeEnabled}
                            addMessage={addMessage}
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
                            <div className="text-center text-[var(--ui-muted)]">
                                <div className="text-sm">No dice stats yet</div>
                                <div className="text-xs text-[var(--ui-muted)]">Roll the dice to see statistics</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
