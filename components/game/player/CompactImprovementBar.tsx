import React from 'react';
import { Metropolis } from '@/themes/tabletop/pieces';

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
    const metropolisSize = size === 'sm' ? 12 : 16;

    return (
        <div
            className={`inline-flex items-center ${gap}`}
            title={`${type.charAt(0).toUpperCase() + type.slice(1)}: Level ${level}/${maxLevel}${hasMetropolis ? ' (Metropolis)' : ''}`}
        >
            {Array.from({ length: maxLevel }, (_, i) => {
                const segmentLevel = i + 1;
                const isUnlockLevel = segmentLevel === unlockLevel;

                // If player has metropolis, the icon REPLACES the dot at their current level
                // The metropolis piece replaces the dot at the player's current level.
                if (hasMetropolis && segmentLevel === level) {
                    return (
                        <svg
                            key={i}
                            viewBox="-13 -19 26 34"
                            width={metropolisSize}
                            height={metropolisSize}
                            aria-label="Metropolis"
                            role="img"
                        >
                            <title>Metropolis</title>
                            <Metropolis color={color.filled} />
                        </svg>
                    );
                }

                // For all other positions, show filled/empty dots
                // With metropolis: filled if before the metropolis (< level)
                // Without metropolis: filled if at or before current level (<= level)
                const isFilled = hasMetropolis ? segmentLevel < level : segmentLevel <= level;
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
