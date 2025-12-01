import React from 'react';
import { DiceStats, DICE_TOTALS } from '@/lib/types';

interface DiceStatsPanelProps {
    stats: DiceStats;
    onClose?: () => void;
}

export const DiceStatsPanel: React.FC<DiceStatsPanelProps> = ({ stats, onClose }) => {
    const totalRolls = DICE_TOTALS.reduce((sum, total) => sum + (stats[total] || 0), 0);

    return (
        <div className="bg-slate-900/85 text-slate-100 border border-slate-700 rounded-lg shadow-xl p-3 w-72 backdrop-blur-sm pointer-events-auto">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className="text-sm font-semibold">Dice Stats</div>
                    <div className="text-xs text-slate-300">{totalRolls} roll{totalRolls === 1 ? '' : 's'}</div>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded hover:border-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                        title="Hide dice stats"
                        aria-label="Hide dice stats"
                    >
                        X
                    </button>
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
        </div>
    );
};
