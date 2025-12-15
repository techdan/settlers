import React from 'react';

const IMPROVEMENT_COLORS = {
    science: {
        filled: 'var(--color-improvement-science-alt)',
    },
    trade: {
        filled: 'var(--color-improvement-trade-alt)',
    },
    politics: {
        filled: 'var(--color-improvement-politics-alt)',
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
    const metropolisClass = size === 'sm' ? 'text-[10px]' : 'text-[14px]';

    return (
        <div
            className={`inline-flex items-center ${gap}`}
            title={`${type.charAt(0).toUpperCase() + type.slice(1)}: Level ${level}/${maxLevel}${hasMetropolis ? ' (Metropolis)' : ''}`}
        >
            {Array.from({ length: maxLevel }, (_, i) => {
                const segmentLevel = i + 1;
                const isFilled = segmentLevel <= level;
                const isUnlockLevel = segmentLevel === unlockLevel;

                // If player has metropolis, show the icon at position 4 (index 3)
                // Level 4: ●●●🏛️○ (3 filled, metropolis, 1 empty)
                // Level 5: ●●●●🏛️ (4 filled, metropolis)
                if (hasMetropolis && segmentLevel === 4) {
                    return (
                        <span key={i} className={metropolisClass} title="Metropolis">🏛️</span>
                    );
                }

                // Don't show 5th dot if we have a metropolis (metropolis replaces position 4)
                if (hasMetropolis && segmentLevel === 5) {
                    // For level 4 metropolis, show empty dot at position 5
                    // For level 5 metropolis, don't show anything (metropolis is final)
                    if (level === 4) {
                        return (
                            <div
                                key={i}
                                className={`${segmentSize} rounded-sm transition-all`}
                                style={{
                                    backgroundColor: 'var(--color-highlight-muted)',
                                    boxShadow: 'none',
                                }}
                            />
                        );
                    }
                    return null;
                }

                return (
                    <div
                        key={i}
                        className={`
                            ${segmentSize} rounded-sm transition-all
                            ${isUnlockLevel ? 'ring-1 ring-amber-400/60' : ''}
                        `}
                        style={{
                            backgroundColor: isFilled ? color.filled : 'var(--color-highlight-muted)',
                            boxShadow: isFilled ? `0 0 4px ${color.filled}` : 'none',
                        }}
                    />
                );
            })}
        </div>
    );
};
