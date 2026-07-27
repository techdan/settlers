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

/** Aspect of the Metropolis piece's viewBox ("-13 -19 26 34"). */
const METROPOLIS_ASPECT = 26 / 34;

/**
 * Compact 5-segment improvement bar for player cards.
 *
 * Dots rather than a numeral because the tactical read is *distance to the
 * metropolis unlock*, not the level itself — the ringed third dot puts that
 * threshold in the geometry, and the metropolis piece replaces the dot at the
 * level where it was earned.
 *
 * `dotSize` is honest pixels: a CSS `scale()` on the caller's side would still
 * reserve the unscaled layout box, so the space it appears to save is not
 * actually returned.
 */
export const CompactImprovementBar: React.FC<{
    type: 'science' | 'trade' | 'politics';
    level: number;
    hasMetropolis?: boolean;
    dotSize?: number;
}> = ({ type, level, hasMetropolis = false, dotSize = 5 }) => {
    const maxLevel = 5;
    const unlockLevel = 3;

    const color = IMPROVEMENT_COLORS[type];
    const gap = Math.max(1, Math.round(dotSize * 0.4));
    const metropolisHeight = Math.round(dotSize * 2.2);

    return (
        <div
            className="inline-flex items-center"
            style={{ gap }}
            title={`${type.charAt(0).toUpperCase() + type.slice(1)}: Level ${level}/${maxLevel}${hasMetropolis ? ' (Metropolis)' : ''}`}
        >
            {Array.from({ length: maxLevel }, (_, i) => {
                const segmentLevel = i + 1;
                const isUnlockLevel = segmentLevel === unlockLevel;

                // The metropolis piece REPLACES the dot at the player's current
                // level, so the trophy sits at the position it was earned.
                if (hasMetropolis && segmentLevel === level) {
                    return (
                        <svg
                            key={i}
                            viewBox="-13 -19 26 34"
                            width={Math.round(metropolisHeight * METROPOLIS_ASPECT)}
                            height={metropolisHeight}
                            aria-label="Metropolis"
                            role="img"
                        >
                            <title>Metropolis</title>
                            <Metropolis color={color.filled} />
                        </svg>
                    );
                }

                // Without metropolis: filled at or before the current level.
                // With metropolis: filled strictly before it (the piece is the level).
                const isFilled = hasMetropolis ? segmentLevel < level : segmentLevel <= level;
                return (
                    <div
                        key={i}
                        className={`rounded-[1px] transition-all ${isUnlockLevel ? 'ring-1 ring-amber-400/60' : ''}`}
                        style={{
                            width: dotSize,
                            height: dotSize,
                            backgroundColor: isFilled ? color.filled : 'var(--color-highlight-muted)',
                            boxShadow: isFilled ? `0 0 3px ${color.filled}` : 'none',
                        }}
                    />
                );
            })}
        </div>
    );
};
