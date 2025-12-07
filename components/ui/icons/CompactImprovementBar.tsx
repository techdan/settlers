import React from 'react';

/**
 * Compact 5-segment improvement bar for player cards.
 * Shows levels 1-5 with visual indicator at unlock level (3).
 */
export const CompactImprovementBar: React.FC<{
    type: 'science' | 'trade' | 'politics';
    level: number;
    hasMetropolis?: boolean;
    size?: 'sm' | 'md';
}> = ({ type, level, hasMetropolis = false, size = 'sm' }) => {
    const maxLevel = 5;
    const unlockLevel = 3;

    const colors = {
        science: {
            filled: 'bg-green-500',
            glow: 'shadow-green-500/30',
        },
        trade: {
            filled: 'bg-yellow-400',
            glow: 'shadow-yellow-400/30',
        },
        politics: {
            filled: 'bg-blue-500',
            glow: 'shadow-blue-500/30',
        },
    };

    const color = colors[type];
    const segmentSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
    const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';

    return (
        <div className={`inline-flex items-center ${gap}`} title={`${type.charAt(0).toUpperCase() + type.slice(1)}: Level ${level}/${maxLevel}${hasMetropolis ? ' (Metropolis)' : ''}`}>
            {Array.from({ length: maxLevel }, (_, i) => {
                const segmentLevel = i + 1;
                const isFilled = segmentLevel <= level;
                const isUnlockLevel = segmentLevel === unlockLevel;

                return (
                    <div
                        key={i}
                        className={`
                            ${segmentSize} rounded-sm transition-all
                            ${isFilled
                                ? `${color.filled} ${color.glow} shadow-sm`
                                : 'bg-slate-600/60'
                            }
                            ${isUnlockLevel ? 'ring-1 ring-amber-400/50' : ''}
                        `}
                    />
                );
            })}
            {hasMetropolis && (
                <span className="text-[10px] ml-0.5" title="Metropolis">🏛️</span>
            )}
        </div>
    );
};
