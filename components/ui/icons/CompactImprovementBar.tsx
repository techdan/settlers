import React from 'react';

/**
 * Colors from docs/ui/icons.md
 * - Science: #729853 / #6bb97f (greens)
 * - Trade: #8dae54 / #c6daa4 (yellow-greens) -> using warmer #c6a34a for better distinction
 * - Politics: #85949a / #d7dfd1 (blue-grays) -> using bluer #7ba3c9 for better distinction
 */
const IMPROVEMENT_COLORS = {
    science: {
        filled: '#6bb97f',
        filledBg: 'bg-[#6bb97f]',
        glow: 'shadow-[#6bb97f]/30',
        ring: 'ring-[#6bb97f]/50',
    },
    trade: {
        filled: '#c6a34a',
        filledBg: 'bg-[#c6a34a]',
        glow: 'shadow-[#c6a34a]/30',
        ring: 'ring-[#c6a34a]/50',
    },
    politics: {
        filled: '#7ba3c9',
        filledBg: 'bg-[#7ba3c9]',
        glow: 'shadow-[#7ba3c9]/30',
        ring: 'ring-[#7ba3c9]/50',
    },
};

/**
 * Compact 5-segment improvement bar for player cards.
 * Shows levels 1-5 with visual indicator at unlock level (3).
 * Uses distinct colors from icons.md to differentiate Science/Trade/Politics.
 */
export const CompactImprovementBar: React.FC<{
    type: 'science' | 'trade' | 'politics';
    level: number;
    hasMetropolis?: boolean;
    size?: 'sm' | 'md';
}> = ({ type, level, hasMetropolis = false, size = 'sm' }) => {
    const maxLevel = 5;
    const unlockLevel = 3;

    const color = IMPROVEMENT_COLORS[type];
    const segmentSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
    const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';
    const metropolisClass = size === 'sm' ? 'text-[10px] ml-0.5' : 'text-[14px] ml-1';

    return (
        <div
            className={`inline-flex items-center ${gap}`}
            title={`${type.charAt(0).toUpperCase() + type.slice(1)}: Level ${level}/${maxLevel}${hasMetropolis ? ' (Metropolis)' : ''}`}
        >
            {Array.from({ length: maxLevel }, (_, i) => {
                const segmentLevel = i + 1;
                const isFilled = segmentLevel <= level;
                const isUnlockLevel = segmentLevel === unlockLevel;

                return (
                    <div
                        key={i}
                        className={`
                            ${segmentSize} rounded-sm transition-all
                            ${isUnlockLevel ? 'ring-1 ring-amber-400/60' : ''}
                        `}
                        style={{
                            backgroundColor: isFilled ? color.filled : 'rgb(71 85 105 / 0.6)', // slate-600/60
                            boxShadow: isFilled ? `0 0 4px ${color.filled}40` : 'none',
                        }}
                    />
                );
            })}
            {hasMetropolis && (
                <span className={metropolisClass} title="Metropolis">🏛️</span>
            )}
        </div>
    );
};
