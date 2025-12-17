import React, { useState, useEffect } from 'react';
import { DiceStats, DICE_TOTALS, EventDieStats, EVENT_DIE_FACES, GameState } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { Tooltip } from '@/components/ui/tooltip';
import { formatTime } from '@/lib/hooks/useTimerState';
import { getTimerStatus } from '@/lib/services/timer-service';

interface DiceStatsPanelProps {
    stats: DiceStats;
    eventStats?: EventDieStats;
    gameState?: GameState;
    onClose?: () => void;
}

const EVENT_FACE_LABELS: Record<EventDieFace, { label: string; color: string }> = {
    ship: { label: 'Barbarian', color: 'bg-slate-500' },
    green: { label: 'Science', color: 'bg-green-500' },
    yellow: { label: 'Trade', color: 'bg-yellow-400' },
    blue: { label: 'Politics', color: 'bg-blue-500' },
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
        <div className="bg-slate-900/85 text-slate-100 border border-slate-700 rounded-lg shadow-xl p-3 w-72 max-w-full backdrop-blur-sm pointer-events-auto overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0 max-w-full">
                <div className="text-sm font-semibold">
                    Dice Stats <span className="text-xs text-slate-300 font-normal">({totalRolls} roll{totalRolls === 1 ? '' : 's'})</span>
                </div>
                {onClose && (
                    <Tooltip content="Hide dice stats" placement="top">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded hover:border-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                            aria-label="Hide dice stats"
                        >
                            X
                        </button>
                    </Tooltip>
                )}
            </div>
            <div className="mt-2 flex flex-col gap-1 max-w-full">
                {DICE_TOTALS.map(total => {
                    const count = stats[total] || 0;
                    const percent = totalRolls > 0 ? Math.round((count / totalRolls) * 100) : 0;
                    return (
                        <div key={total} className="grid grid-cols-5 items-center gap-1 text-xs text-slate-200">
                            <div className="text-center font-mono">{total}</div>
                            <div className="col-span-3 h-2 bg-slate-700 rounded-full overflow-hidden ml-3 mr-2">
                                <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="text-right text-slate-300">{count}</div>
                        </div>
                    );
                })}
            </div>

            {shouldShowEventStats && (
                <div className="mt-3">
                    <div className="text-sm font-semibold mb-1">
                        Event Die <span className="text-xs text-slate-300 font-normal">({totalEventRolls} roll{totalEventRolls === 1 ? '' : 's'})</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        {EVENT_DIE_FACES.map(face => {
                            const count = eventStats[face] || 0;
                            const percent = totalEventRolls > 0 ? Math.round((count / totalEventRolls) * 100) : 0;
                            const { label, color } = EVENT_FACE_LABELS[face];
                            return (
                                <div key={face} className="grid grid-cols-5 items-center gap-1 text-xs text-slate-200">
                                    <div className="text-left font-semibold">{label}</div>
                                    <div className="col-span-3 h-2 bg-slate-700 rounded-full overflow-hidden ml-3 mr-2">
                                        <div
                                            className={`h-full ${color}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <div className="text-right text-slate-300">{count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Total Gameplay Time */}
            {gameState?.timerConfig?.enabled && totalGameplayTime > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-200">
                        <div className="font-semibold">Total Time</div>
                        <div className="text-sm font-bold text-amber-400 tabular-nums">{formatTime(totalGameplayTime)}</div>
                    </div>
                </div>
            )}
        </div>
    );
};
