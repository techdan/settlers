import React, { useState, useEffect } from 'react';
import { DiceStats, DICE_TOTALS, EventDieStats, EVENT_DIE_FACES, GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { Tooltip } from '@/components/ui/tooltip';
import { formatTime } from '@/lib/hooks/useTimerState';
import { getTimerStatus } from '@/lib/services/timer-service';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

interface DiceStatsPanelProps {
    stats: DiceStats;
    eventStats?: EventDieStats;
    gameState?: GameState;
    onClose?: () => void;
}

const EVENT_FACE_LABELS: Record<EventDieFace, { label: string; color: string }> = {
    ship: { label: 'Barbarian', color: 'bg-[var(--ui-muted)]' },
    science: { label: 'Science', color: 'bg-[var(--color-improvement-science-alt)]' },
    trade: { label: 'Trade', color: 'bg-[var(--color-improvement-trade-alt)]' },
    politics: { label: 'Politics', color: 'bg-[var(--color-improvement-politics-alt)]' },
};

export const DiceStatsPanel: React.FC<DiceStatsPanelProps> = ({ stats, eventStats, gameState, onClose }) => {
    const [tick, setTick] = useState(0);
    const totalRolls = DICE_TOTALS.reduce((sum, total) => sum + (stats[total] || 0), 0);
    const isCitiesAndKnights = gameState?.gameMode === 'cities_and_knights';
    const shouldShowEventStats = isCitiesAndKnights && !!eventStats;
    const totalEventRolls = shouldShowEventStats ? EVENT_DIE_FACES.reduce((sum, face) => sum + (eventStats?.[face] || 0), 0) : 0;

    // Update every second when timer is active
    useEffect(() => {
        if (!gameState?.timerConfig?.enabled || !gameState?.turnStartTime) {
            return;
        }

        const interval = setInterval(() => {
            setTick(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState?.turnStartTime, gameState?.timerConfig?.enabled]);

    // Calculate total gameplay time (including current turn in progress)
    const totalGameplayTime = React.useMemo(() => {
        if (!gameState?.playerTotalTime) {
            return 0;
        }

        // Sum up all players' total time
        let total = Object.values(gameState.playerTotalTime).reduce((sum, time) => sum + time, 0);

        // Add current turn elapsed time if timer is active
        if (gameState.timerConfig?.enabled && gameState.turnStartTime) {
            const timerStatus = getTimerStatus(gameState);
            if (timerStatus.isActive) {
                // Add the elapsed time from the current turn (capped at time limit)
                const countedTime = Math.min(timerStatus.timeElapsed, timerStatus.timeLimit);
                total += countedTime;
            }
        }

        return total;
    }, [gameState, tick]); // Re-calculate when gameState changes or tick updates

    return (
        <div className="pointer-events-auto w-72 max-w-full overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-3 text-[var(--ui-text)] shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 min-w-0 max-w-full">
                <div className="text-sm font-semibold">
                    Dice Stats <span className="text-xs font-normal text-[var(--ui-muted)]">({totalRolls} roll{totalRolls === 1 ? '' : 's'})</span>
                </div>
                {onClose && (
                    <Tooltip content="Hide dice stats" placement="top">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-1 text-[var(--ui-muted)] transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-text)]"
                            aria-label="Hide dice stats"
                        >
                            <TabletopStatusIcon type="cancel" size={14} />
                        </button>
                    </Tooltip>
                )}
            </div>
            <div className="mt-2 flex flex-col gap-1 max-w-full">
                {DICE_TOTALS.map(total => {
                    const count = stats[total] || 0;
                    const percent = totalRolls > 0 ? Math.round((count / totalRolls) * 100) : 0;
                    return (
                        <div key={total} className="grid grid-cols-5 items-center gap-1 text-xs text-[var(--ui-text)]">
                            <div className="text-center font-mono">{total}</div>
                            <div className="col-span-3 ml-3 mr-2 h-2 overflow-hidden rounded-full bg-[var(--ui-panel-raised)]">
                                <div
                                    className="h-full bg-[var(--ui-accent)]"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="text-right text-[var(--ui-muted)]">{count}</div>
                        </div>
                    );
                })}
            </div>

            {shouldShowEventStats && (
                <div className="mt-3">
                    <div className="text-sm font-semibold mb-1">
                        Event Die <span className="text-xs font-normal text-[var(--ui-muted)]">({totalEventRolls} roll{totalEventRolls === 1 ? '' : 's'})</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {EVENT_DIE_FACES.map(face => {
                            const count = eventStats[face] || 0;
                            const percent = totalEventRolls > 0 ? Math.round((count / totalEventRolls) * 100) : 0;
                            const { label, color } = EVENT_FACE_LABELS[face];
                            return (
                                <div key={face} className="grid grid-cols-5 items-center gap-1 text-xs text-[var(--ui-text)]">
                                    <div className="text-left font-semibold">{label}</div>
                                    <div className="col-span-3 ml-3 mr-2 h-2 overflow-hidden rounded-full bg-[var(--ui-panel-raised)]">
                                        <div
                                            className={`h-full ${color}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <div className="text-right text-[var(--ui-muted)]">{count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Total Gameplay Time */}
            {gameState?.timerConfig?.enabled && totalGameplayTime > 0 && (
                <div className="mt-3 border-t border-[var(--ui-border)] pt-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--ui-text)]">
                        <div className="font-semibold">Total Time</div>
                        <div className="text-sm font-bold tabular-nums text-[var(--ui-accent)]">{formatTime(totalGameplayTime)}</div>
                    </div>
                </div>
            )}
        </div>
    );
};
