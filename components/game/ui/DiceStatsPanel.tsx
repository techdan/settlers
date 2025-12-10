import React from 'react';
import { DiceStats, DICE_TOTALS, EventDieStats, EVENT_DIE_FACES } from '@/lib/types';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { Tooltip } from '@/components/ui/tooltip';

interface DiceStatsPanelProps {
    stats: DiceStats;
    eventStats?: EventDieStats;
    onClose?: () => void;
}

const EVENT_FACE_LABELS: Record<EventDieFace, { label: string; color: string }> = {
    ship: { label: 'Barbarian', color: 'bg-slate-500' },
    green: { label: 'Science', color: 'bg-green-500' },
    yellow: { label: 'Trade', color: 'bg-yellow-400' },
    blue: { label: 'Politics', color: 'bg-blue-500' },
};

export const DiceStatsPanel: React.FC<DiceStatsPanelProps> = ({ stats, eventStats, onClose }) => {
    const totalRolls = DICE_TOTALS.reduce((sum, total) => sum + (stats[total] || 0), 0);
    const totalEventRolls = EVENT_DIE_FACES.reduce((sum, face) => sum + ((eventStats && eventStats[face]) || 0), 0);

    return (
        <div className="bg-slate-900/85 text-slate-100 border border-slate-700 rounded-lg shadow-xl p-3 w-72 backdrop-blur-sm pointer-events-auto">
            <div className="flex items-center justify-between gap-2">
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
            <div className="mt-3 flex flex-col gap-2">
                {DICE_TOTALS.map(total => {
                    const count = stats[total] || 0;
                    const percent = totalRolls > 0 ? Math.round((count / totalRolls) * 100) : 0;
                    return (
                        <div key={total} className="grid grid-cols-5 items-center gap-2 text-xs text-slate-200">
                            <div className="text-center font-mono">{total}</div>
                            <div className="col-span-3 h-2 bg-slate-700 rounded-full overflow-hidden">
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

            {eventStats && (
                <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">
                        Event Die <span className="text-xs text-slate-300 font-normal">({totalEventRolls} roll{totalEventRolls === 1 ? '' : 's'})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {EVENT_DIE_FACES.map(face => {
                            const count = eventStats[face] || 0;
                            const percent = totalEventRolls > 0 ? Math.round((count / totalEventRolls) * 100) : 0;
                            const { label, color } = EVENT_FACE_LABELS[face];
                            return (
                                <div key={face} className="grid grid-cols-5 items-center gap-2 text-xs text-slate-200">
                                    <div className="text-left font-semibold">{label}</div>
                                    <div className="col-span-3 h-2 bg-slate-700 rounded-full overflow-hidden">
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
        </div>
    );
};
