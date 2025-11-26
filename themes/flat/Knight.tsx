import React from 'react';
import { Knight } from '@/lib/types/player';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

interface FlatKnightProps {
    knight: Knight;
    color: string;
}

export const FlatKnight: React.FC<FlatKnightProps> = ({ knight, color }) => {
    const level = knight.level;
    const isActive = knight.active;

    // Size scales with level
    const sizes = {
        basic: 12,
        strong: 14,
        mighty: 16
    };
    const size = sizes[level];

    // Level indicator
    const levelNumber = CK_CONSTANTS.KNIGHT_STRENGTH[level];

    return (
        <g transform={`translate(0, -${size + 2})`}>
            {/* Shield shape */}
            <path
                d={`M 0 -${size * 0.8} L ${size * 0.6} -${size * 0.4} L ${size * 0.6} ${size * 0.2} L 0 ${size * 0.8} L -${size * 0.6} ${size * 0.2} L -${size * 0.6} -${size * 0.4} Z`}
                fill={color}
                stroke={isActive ? '#FFD700' : '#000'}
                strokeWidth={isActive ? 2.5 : 2}
                opacity={isActive ? 1 : 0.7}
                filter={isActive ? 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.8))' : 'none'}
            />

            {/* Level indicator circle */}
            <circle
                cx={0}
                cy={0}
                r={size * 0.35}
                fill={isActive ? '#FFD700' : '#FFF'}
                stroke={isActive ? '#FFF' : '#000'}
                strokeWidth={1.5}
            />

            {/* Level number */}
            <text
                x={0}
                y={0}
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
