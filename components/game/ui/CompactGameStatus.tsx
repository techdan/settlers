'use client';

import React from 'react';
import { GameState } from '@/lib/types';
import { CompactPlayerCard, PlayerCardTimer } from '../player/CompactPlayerCard';
import { useTimerState, formatTime, getTimerTextColorClass } from '@/lib/hooks/useTimerState';

interface CompactGameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
    onOpenCityManagement?: () => void;
}

/**
 * Compact game status panel for the redesigned right sidebar.
 * Shows phase indicator and compact player cards.
 */
export const CompactGameStatus: React.FC<CompactGameStatusProps> = ({
    gameState,
    currentPlayerId,
    onOpenCityManagement,
}) => {
    const timerStatus = useTimerState(gameState);
    const isTimerEnabled = gameState.timerConfig?.enabled;

    // Determine what time to display
    let displayTime: string = '';
    let displayColor: string = 'text-[var(--ui-muted)]';

    if (!isTimerEnabled) {
        displayTime = '';
    } else if (timerStatus.isActive) {
        // Timer is running - show remaining time
        displayTime = formatTime(timerStatus.timeRemaining);
        displayColor = getTimerTextColorClass(timerStatus.timeRemaining, timerStatus.timeLimit);
    } else {
        // Timer not active (between turns) - show default turn time or 0:00
        const defaultTime = gameState.timerConfig?.turnTimeLimit || 0;
        displayTime = formatTime(defaultTime);
        displayColor = 'text-[var(--ui-muted)]';
    }

    // The turn clock rides on the active player's card rather than in this
    // header: whose turn it is and how long is left are one fact, and splitting
    // them made the bar read as a property of the phase instead of the player.
    // The hook stays subscribed once here — four per-card subscriptions would
    // mean four independent one-second render loops.
    const baseTimeLimit = gameState.timerConfig?.turnTimeLimit || 180;
    let activeTimer: PlayerCardTimer | null = null;

    if (isTimerEnabled && timerStatus.isActive) {
        let colorClass = 'bg-green-500';
        if (timerStatus.timeRemaining <= 0) {
            colorClass = 'bg-red-600';
        } else if (timerStatus.timeRemaining <= 10) {
            colorClass = 'bg-red-500 animate-pulse';
        } else if (timerStatus.timeRemaining <= 30) {
            colorClass = 'bg-orange-500';
        } else if (timerStatus.timeRemaining <= 60) {
            colorClass = 'bg-yellow-500';
        }

        activeTimer = {
            percentage: Math.min(100, (timerStatus.timeElapsed / baseTimeLimit) * 100),
            colorClass,
        };
    }

    return (
        // w-full/min-h-0 let this panel be squeezed by the right rail on truly
        // short viewports; the phase header stays pinned in that fallback.
        <div className="w-full min-h-0 bg-[var(--ui-panel)] p-3 rounded-lg text-[var(--ui-text)] border border-[var(--ui-border)] shadow-xl backdrop-blur-sm flex flex-col gap-3 overflow-visible">
            {/* Phase Header with Timer */}
            <div className="flex-shrink-0">
                <div className="text-[10px] text-[var(--ui-muted)] uppercase tracking-wider">Phase</div>
                <div className="flex items-center justify-between gap-2">
                    <div className="text-base font-bold capitalize text-blue-200">
                        {formatPhase(gameState.phase)}
                    </div>
                    {isTimerEnabled && (
                        <div className="flex flex-col items-end gap-1">
                            <div className={`text-sm font-bold tabular-nums ${displayColor || 'text-[var(--ui-muted)]'}`}>
                                {displayTime}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Player Cards */}
            {/* The list keeps its intrinsic height in ordinary layouts. The
                tablet drawer scrolls as a whole; only a desktop viewport below
                the HUD's minimum-density height gets an internal fallback
                scroller so no player card can become unreachable. */}
            <div className="flex min-h-0 flex-col gap-1.5 overflow-y-visible [@media(min-width:1280px)_and_(max-height:620px)]:overflow-y-auto [@media(min-width:1280px)_and_(max-height:620px)]:overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gameState.players.map(player => (
                    <CompactPlayerCard
                        key={player.id}
                        player={player}
                        gameState={gameState}
                        isCurrentPlayer={player.id === currentPlayerId}
                        isTurn={gameState.currentTurn === player.id}
                        onOpenCityManagement={onOpenCityManagement}
                        timer={gameState.currentTurn === player.id ? activeTimer : null}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Format phase name for display
 */
function formatPhase(phase: string): string {
    // Handle common phase names
    const phaseLabels: Record<string, string> = {
        waiting_for_roll: 'Roll Dice',
        main_phase: 'Main Phase',
        robber_placement: 'Move Robber',
        theft_selection: 'Steal Resource',
        discard_phase: 'Discard Cards',
        setup_settlement_1: 'Setup: Settlement 1',
        setup_road_1: 'Setup: Road 1',
        setup_settlement_2: 'Setup: Settlement 2',
        setup_road_2: 'Setup: Road 2',
        knight_displacement: 'Knight Displaced',
        barbarian_city_selection: 'Barbarian Attack',
        aqueduct_selection: 'Aqueduct',
        game_over: 'Game Over',
    };

    return phaseLabels[phase] || phase.replace(/_/g, ' ');
}
