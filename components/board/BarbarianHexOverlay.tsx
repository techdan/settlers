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
 * On-board barbarian track display.
 * Shows knight vs barbarian strength and track position.
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
            <div className={`
                flex flex-col gap-2 p-3 rounded-lg border-2 shadow-lg backdrop-blur-sm
                transition-all duration-300
                ${isAttacking
                    ? 'bg-red-900/90 border-red-500 animate-pulse'
                    : isDefeatImminent
                        ? 'bg-slate-900/90 border-red-600'
                        : 'bg-slate-900/90 border-slate-600'
                }
            `}>
                {/* Header */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <span>🏴‍☠️</span>
                    <span>Barbarians</span>
                </div>

                {/* Strength comparison */}
                <div className="flex flex-col gap-1">
                    {/* Knights */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span>⚔️</span>
                            <span className="text-slate-400">Knights</span>
                        </div>
                        <span className={`
                            text-sm font-bold tabular-nums
                            ${totalKnightStrength >= totalCityCount ? 'text-green-400' : 'text-white'}
                        `}>
                            {totalKnightStrength}
                        </span>
                    </div>

                    {/* Barbarians (cities) */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span>🚢</span>
                            <span className="text-slate-400">Strength</span>
                        </div>
                        <span className={`
                            text-sm font-bold tabular-nums
                            ${isDefeatImminent ? 'text-red-400' : 'text-white'}
                        `}>
                            {totalCityCount}
                        </span>
                    </div>
                </div>

                {/* Status indicator */}
                <div className={`
                    text-[10px] font-semibold text-center py-1 rounded
                    ${isDefeatImminent
                        ? 'bg-red-500/30 text-red-300'
                        : 'bg-green-500/30 text-green-300'
                    }
                `}>
                    {isDefeatImminent ? '⚠️ LOSING' : '✓ WINNING'}
                </div>

                {/* Track position */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-center gap-0.5">
                        {Array.from({ length: attackThreshold + 1 }, (_, i) => {
                            const isCurrent = i === barbarianPosition;
                            const isPassed = i < barbarianPosition;
                            const isLast = i === attackThreshold;

                            return (
                                <div
                                    key={i}
                                    className={`
                                        w-2.5 h-2.5 rounded-full transition-all
                                        ${isCurrent
                                            ? 'bg-red-500 ring-2 ring-red-400 ring-offset-1 ring-offset-slate-900'
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
                    <div className="text-[10px] text-center text-slate-500">
                        {isAttacking
                            ? '⚔️ ATTACK!'
                            : `${barbarianPosition} / ${attackThreshold}`
                        }
                    </div>
                </div>
            </div>
        </Tooltip>
    );
};
