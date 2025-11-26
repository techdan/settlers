import React, { useTransition } from 'react';
import { PlayerState } from '@/lib/types';
import { ImprovementType, CK_CONSTANTS, IMPROVEMENT_UPGRADE_COSTS } from '@/core/rules/commodity-constants';

interface CityImprovementsProps {
    player: PlayerState;
    roomId: string;
    onUpgrade: (improvement: ImprovementType) => Promise<void>;
}

const IMPROVEMENT_COLORS: Record<ImprovementType, string> = {
    science: 'bg-green-600',
    trade: 'bg-yellow-500',
    politics: 'bg-blue-600'
};

const IMPROVEMENT_LABELS: Record<ImprovementType, string> = {
    science: 'Science (📜 Paper)',
    trade: 'Trade (🧵 Cloth)',
    politics: 'Politics (🪙 Coin)'
};

const IMPROVEMENT_EVENT_DIE: Record<ImprovementType, { icon: string; color: string; label: string }> = {
    science: { icon: '🔬', color: 'bg-green-600', label: 'Green event die' },
    trade: { icon: '💰', color: 'bg-yellow-500', label: 'Yellow event die' },
    politics: { icon: '⚖️', color: 'bg-blue-600', label: 'Blue event die' }
};

const IMPROVEMENT_COMMODITY: Record<ImprovementType, 'paper' | 'cloth' | 'coin'> = {
    science: 'paper',
    trade: 'cloth',
    politics: 'coin'
};

export const CityImprovements: React.FC<CityImprovementsProps> = ({ player, roomId, onUpgrade }) => {
    const [isPending, startTransition] = useTransition();

    // Only show in C&K mode
    if (!player.improvements || !player.commodities) {
        return null;
    }

    const canAffordUpgrade = (improvement: ImprovementType): boolean => {
        const currentLevel = player.improvements![improvement] || 0;
        if (currentLevel >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL) return false;

        const cost = IMPROVEMENT_UPGRADE_COSTS[currentLevel];
        const commodity = IMPROVEMENT_COMMODITY[improvement];
        return (player.commodities![commodity] || 0) >= cost;
    };

    const handleUpgrade = (improvement: ImprovementType) => {
        if (!canAffordUpgrade(improvement)) return;

        startTransition(async () => {
            try {
                await onUpgrade(improvement);
            } catch (error) {
                console.error('Failed to upgrade improvement:', error);
            }
        });
    };

    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                City Improvements
            </h3>

            {/* Dice Information */}
            <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">
                    🎲 <span className="text-red-400 font-bold">Red</span> + <span className="text-yellow-400 font-bold">Yellow</span> dice produce resources/commodities
                </div>
                <div className="text-xs text-slate-400">
                    Event die (Level 3+): Draw progress cards when your color rolls
                </div>
            </div>

            <div className="space-y-3">
                {(['science', 'trade', 'politics'] as ImprovementType[]).map(improvement => {
                    const level = player.improvements![improvement] || 0;
                    const cost = IMPROVEMENT_UPGRADE_COSTS[level];
                    const canAfford = canAffordUpgrade(improvement);
                    const isMaxLevel = level >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL;
                    const commodity = IMPROVEMENT_COMMODITY[improvement];
                    const hasEnough = (player.commodities![commodity] || 0) >= cost;
                    const eventDie = IMPROVEMENT_EVENT_DIE[improvement];

                    return (
                        <div key={improvement} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{IMPROVEMENT_LABELS[improvement]}</span>
                                    <div
                                        className={`w-5 h-5 ${eventDie.color} rounded flex items-center justify-center text-xs`}
                                        title={eventDie.label}
                                    >
                                        {eventDie.icon}
                                    </div>
                                </div>
                                <span className="text-slate-400">
                                    Level {level}/{CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex gap-1">
                                {Array.from({ length: CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL }, (_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-2 rounded ${
                                            i < level
                                                ? IMPROVEMENT_COLORS[improvement]
                                                : 'bg-slate-700'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Upgrade Button */}
                            {!isMaxLevel && (
                                <button
                                    onClick={() => handleUpgrade(improvement)}
                                    disabled={!canAfford || isPending}
                                    className={`w-full text-xs py-1.5 px-2 rounded font-medium transition-colors ${
                                        canAfford
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isPending ? (
                                        'Upgrading...'
                                    ) : (
                                        <>
                                            Upgrade ({cost} {IMPROVEMENT_COMMODITY[improvement]})
                                            {!hasEnough && ` - Need ${cost - (player.commodities![commodity] || 0)} more`}
                                        </>
                                    )}
                                </button>
                            )}
                            {isMaxLevel && (
                                <div className="w-full text-xs py-1.5 px-2 rounded font-medium bg-yellow-600/20 text-yellow-400 text-center">
                                    ✓ Maximum Level
                                </div>
                            )}

                            {/* Metropolis Status */}
                            {level >= CK_CONSTANTS.METROPOLIS_REQUIREMENT && (
                                <div className="text-xs text-yellow-400 flex items-center gap-1">
                                    <span>👑</span>
                                    <span>Metropolis available!</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
