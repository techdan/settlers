'use client';

import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

interface BarbarianHexOverlayProps {
    barbarianPosition: number;      // 0-7 (attacks at 7)
    totalKnightStrength: number;    // Sum of all players' active knights
    totalCityCount: number;         // Sum of all players' cities
}

/**
 * Renders a single hexagonal tile with the given content.
 * Uses SVG polygon for the hex shape with dark/ominous styling.
 */
const HexTile: React.FC<{
    children: React.ReactNode;
    variant?: 'knights' | 'barbarians';
    isWarning?: boolean;
}> = ({ children, variant = 'knights', isWarning = false }) => {
    // Hex dimensions
    const size = 50;
    const width = size * 2;
    const height = size * Math.sqrt(3);

    // Generate pointy-topped hexagon points
    const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from top
        const x = size + size * Math.cos(angle);
        const y = height / 2 + size * Math.sin(angle);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const gradientId = `barbarian-hex-gradient-${variant}`;
    const glowId = `barbarian-hex-glow-${variant}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
        >
            <defs>
                {/* Gradient fill for hex - dark, ominous look */}
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    {variant === 'barbarians' ? (
                        <>
                            <stop offset="0%" stopColor="var(--color-barbarian-gradient-start)" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="var(--color-barbarian-gradient-end)" stopOpacity="0.95" />
                        </>
                    ) : (
                        <>
                            <stop offset="0%" stopColor="var(--color-barbarian-gradient-start)" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="var(--color-barbarian-gradient-end-alt)" stopOpacity="0.95" />
                        </>
                    )}
                </linearGradient>
                {/* Glow filter for emphasis */}
                <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Hex background with stroke */}
            <polygon
                points={points}
                fill={`url(#${gradientId})`}
                stroke={isWarning ? 'var(--color-highlight-warning)' : variant === 'barbarians' ? 'var(--color-barbarian-stroke-dark)' : 'var(--color-barbarian-stroke-muted)'}
                strokeWidth="2"
                className={`transition-all duration-300 ${isWarning ? 'animate-pulse' : ''}`}
                filter={isWarning ? `url(#${glowId})` : undefined}
            />

            {/* Content overlay */}
            <foreignObject x="0" y="0" width={width} height={height}>
                <div
                    className="flex flex-col items-center justify-center w-full h-full"
                    style={{ height: `${height}px` }}
                >
                    {children}
                </div>
            </foreignObject>
        </svg>
    );
};

/**
 * On-board barbarian track display using two hex tiles.
 * Shows knight vs barbarian strength similar to reference design.
 * Positioned in the upper-left area, below map controls.
 */
export const BarbarianHexOverlay: React.FC<BarbarianHexOverlayProps> = ({
    barbarianPosition,
    totalKnightStrength,
    totalCityCount,
}) => {
    const attackThreshold = CK_CONSTANTS.BARBARIAN_ATTACK_POSITION;
    const isDefeatImminent = totalKnightStrength < totalCityCount;
    const isAttacking = barbarianPosition >= attackThreshold;

    const tooltipContent = `
Barbarian Track
Position: ${barbarianPosition} / ${attackThreshold}
${isAttacking ? '⚔️ ATTACKING!' : `${attackThreshold - barbarianPosition} ship rolls until attack`}

Defense Status:
• Total Cities: ${totalCityCount} (barbarian strength)
• Active Knights: ${totalKnightStrength}
• Status: ${isDefeatImminent ? '❌ Defenders LOSING' : '✅ Defenders WIN'}

${isDefeatImminent
            ? 'Warning: If barbarians attack now, weakest contributor loses a city!'
            : 'Catan is well defended.'}
    `.trim();

    return (
        <Tooltip
            content={tooltipContent}
            className="cursor-default"
            tooltipClassName="min-w-[16rem] max-w-[22rem] whitespace-pre-line text-xs"
            placement="right"
        >
            <div className="flex flex-col items-center -space-y-4">
                {/* Upper Hex: Active Knights */}
                <HexTile variant="knights" isWarning={false}>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xl font-bold tabular-nums ${totalKnightStrength >= totalCityCount ? 'text-emerald-400' : 'text-white'
                            }`}>
                            {totalKnightStrength}
                        </span>
                        <span className="text-slate-200">⚔️</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Active knights
                    </div>
                </HexTile>

                {/* Lower Hex: Barbarian Strength */}
                <HexTile variant="barbarians" isWarning={isDefeatImminent || isAttacking}>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xl font-bold tabular-nums ${isDefeatImminent ? 'text-red-400' : 'text-white'
                            }`}>
                            {totalCityCount}
                        </span>
                        <span className="text-slate-200">🏴‍☠️</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Barbarian strength
                    </div>
                </HexTile>

                {/* Progress indicator - small dots below hexes */}
                <div className="flex items-center justify-center gap-0.5 pt-2">
                    {Array.from({ length: attackThreshold + 1 }, (_, i) => {
                        const isCurrent = i === barbarianPosition;
                        const isPassed = i < barbarianPosition;
                        const isLast = i === attackThreshold;

                        return (
                            <div
                                key={i}
                                className={`
                                    w-2 h-2 rounded-full transition-all
                                    ${isCurrent
                                        ? 'bg-red-500 ring-2 ring-red-400 ring-offset-1 ring-offset-slate-900 scale-110'
                                        : isPassed
                                            ? 'bg-slate-500'
                                            : isLast
                                                ? 'bg-red-900/50 ring-1 ring-red-700'
                                                : 'bg-slate-700'
                                    }
                                `}
                                title={i === attackThreshold ? 'Attack!' : `Position ${i}`}
                            />
                        );
                    })}
                </div>
                <div className="text-[9px] text-center text-slate-500 pt-0.5">
                    {isAttacking
                        ? '⚔️ ATTACK!'
                        : `${barbarianPosition} / ${attackThreshold}`
                    }
                </div>
            </div>
        </Tooltip>
    );
};
