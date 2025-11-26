import React from 'react';
import { Knight } from '@/lib/types/player';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

interface VoxelKnightProps {
    knight: Knight;
    color: string;
}

export const VoxelKnight: React.FC<VoxelKnightProps> = ({ knight, color }) => {
    const level = knight.level;
    const isActive = knight.active;

    // Size scales with level
    const sizes = {
        basic: 10,
        strong: 12,
        mighty: 14
    };
    const size = sizes[level];

    // 3D depth effect
    const DEPTH = 4;

    // Level indicator
    const levelNumber = CK_CONSTANTS.KNIGHT_STRENGTH[level];

    // Brightness filters for 3D effect
    const topBrightness = isActive ? 1.2 : 0.9;
    const leftBrightness = isActive ? 0.8 : 0.6;
    const rightBrightness = isActive ? 0.6 : 0.5;

    return (
        <g transform={`translate(0, -${size + DEPTH + 4})`}>
            {/* 3D Shield with depth */}

            {/* Left side face */}
            <path
                d={`M -${size * 0.5} -${size * 0.6}
                    L -${size * 0.5} -${size * 0.6 - DEPTH}
                    L -${size * 0.5} ${size * 0.1 - DEPTH}
                    L -${size * 0.15} ${size * 0.6 - DEPTH}
                    L -${size * 0.15} ${size * 0.6}
                    L -${size * 0.5} ${size * 0.1}
                    Z`}
                fill={color}
                filter={`brightness(${leftBrightness})`}
                stroke="none"
            />

            {/* Right side face */}
            <path
                d={`M ${size * 0.5} -${size * 0.6}
                    L ${size * 0.5} -${size * 0.6 - DEPTH}
                    L ${size * 0.5} ${size * 0.1 - DEPTH}
                    L ${size * 0.15} ${size * 0.6 - DEPTH}
                    L ${size * 0.15} ${size * 0.6}
                    L ${size * 0.5} ${size * 0.1}
                    Z`}
                fill={color}
                filter={`brightness(${rightBrightness})`}
                stroke="none"
            />

            {/* Top face (main shield) */}
            <path
                d={`M 0 -${size * 0.8 + DEPTH}
                    L ${size * 0.5} -${size * 0.6 + DEPTH}
                    L ${size * 0.5} ${size * 0.1 + DEPTH}
                    L 0 ${size * 0.6 + DEPTH}
                    L -${size * 0.5} ${size * 0.1 + DEPTH}
                    L -${size * 0.5} -${size * 0.6 + DEPTH}
                    Z`}
                fill={color}
                filter={`brightness(${topBrightness})`}
                stroke={isActive ? '#FFD700' : '#333'}
                strokeWidth={isActive ? 2 : 1}
            />

            {/* Glow effect for active knights */}
            {isActive && (
                <path
                    d={`M 0 -${size * 0.8 + DEPTH}
                        L ${size * 0.5} -${size * 0.6 + DEPTH}
                        L ${size * 0.5} ${size * 0.1 + DEPTH}
                        L 0 ${size * 0.6 + DEPTH}
                        L -${size * 0.5} ${size * 0.1 + DEPTH}
                        L -${size * 0.5} -${size * 0.6 + DEPTH}
                        Z`}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={3}
                    opacity={0.6}
                    filter="blur(2px)"
                />
            )}

            {/* Level indicator circle on top face */}
            <circle
                cx={0}
                cy={DEPTH}
                r={size * 0.35}
                fill={isActive ? '#FFD700' : '#FFF'}
                stroke={isActive ? '#FFF' : '#000'}
                strokeWidth={1.5}
            />

            {/* Level number */}
            <text
                x={0}
                y={DEPTH}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.5}
                fontWeight="bold"
                fill={isActive ? '#000' : '#333'}
            >
                {levelNumber}
            </text>
        </g>
    );
};
