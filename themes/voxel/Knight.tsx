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

    // Level indicator
    const levelNumber = CK_CONSTANTS.KNIGHT_STRENGTH[level];

    // Rider box height scales with level (doubled)
    const riderHeights = {
        basic: 12,    // Small box
        strong: 16,   // Medium box
        mighty: 20    // Large box
    };
    const riderHeight = riderHeights[level];

    // Brightness filters for 3D effect (brighter if active)
    const horseBrightness = {
        left: isActive ? 0.6 : 0.5,
        right: isActive ? 0.4 : 0.35,
        top: isActive ? 0.8 : 0.7
    };

    const riderBrightness = {
        left: isActive ? 0.8 : 0.65,
        right: isActive ? 0.6 : 0.5,
        top: isActive ? 1.0 : 0.85
    };

    // Opacity for inactive knights (matching 2D implementation)
    const knightOpacity = isActive ? 1 : 0.5;

    return (
        <g>
            {/* Tooltip - transparent rect outside scaled/opacity group */}
            <rect x={-16} y={-64} width={32} height={72} fill="transparent" pointerEvents="all">
                <title>{level === 'basic' ? 'Basic' : level === 'strong' ? 'Strong' : 'Mighty'} Knight (Strength {levelNumber}) - {isActive ? 'Active' : 'Inactive'}</title>
            </rect>

            <g transform="translate(0, -4) scale(2)" opacity={knightOpacity} style={{ pointerEvents: 'none' }}>
                {/* HORSE BASE */}
            {/* Horse body - left face */}
            <path
                d="M 0 6 L -6 3 L -6 -2 L 0 1 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.left})`}
            />
            {/* Horse body - right face */}
            <path
                d="M 0 6 L 6 3 L 6 -2 L 0 1 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.right})`}
            />
            {/* Horse body - top */}
            <path
                d="M 0 1 L -6 -2 L 0 -5 L 6 -2 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.top})`}
            />

            {/* Horse head/neck - front left */}
            <path
                d="M 0 1 L -2 0 L -2 -6 L 0 -5 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.left})`}
            />
            {/* Horse head/neck - front right */}
            <path
                d="M 0 1 L 2 0 L 2 -6 L 0 -5 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.right})`}
            />
            {/* Horse head - top */}
            <path
                d="M 0 -5 L -2 -6 L 0 -8 L 2 -6 Z"
                fill="#5c4033"
                filter={`brightness(${horseBrightness.top})`}
            />

            {/* RIDER (KNIGHT) BOX */}
            {/* Rider - left face */}
            <path
                d={`M 0 -2 L -5 -4.5 L -5 -${4.5 + riderHeight} L 0 -${2 + riderHeight} Z`}
                fill={color}
                filter={`brightness(${riderBrightness.left})`}
            />
            {/* Rider - right face */}
            <path
                d={`M 0 -2 L 5 -4.5 L 5 -${4.5 + riderHeight} L 0 -${2 + riderHeight} Z`}
                fill={color}
                filter={`brightness(${riderBrightness.right})`}
            />
            {/* Rider - top */}
            <path
                d={`M 0 -${2 + riderHeight} L -5 -${4.5 + riderHeight} L 0 -${7 + riderHeight} L 5 -${4.5 + riderHeight} Z`}
                fill={color}
                filter={`brightness(${riderBrightness.top})`}
                stroke={isActive ? '#FFD700' : 'none'}
                strokeWidth={isActive ? 1.5 : 0}
            />

            {/* Glow effect for active knights */}
            {isActive && (
                <path
                    d={`M 0 -${2 + riderHeight} L -5 -${4.5 + riderHeight} L 0 -${7 + riderHeight} L 5 -${4.5 + riderHeight} Z`}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={2}
                    opacity={0.7}
                    style={{ filter: 'blur(1.5px)' }}
                />
            )}

            {/* Level indicator on rider's top */}
            <circle
                cx={0}
                cy={-4 - riderHeight}
                r={3}
                fill={isActive ? '#FFD700' : '#FFF'}
                stroke={isActive ? '#FFF' : '#000'}
                strokeWidth={1}
            />

            {/* Level number */}
            <text
                x={0}
                y={-4 - riderHeight}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={4}
                fontWeight="bold"
                fill={isActive ? '#000' : '#333'}
            >
                {levelNumber}
            </text>
            </g>
        </g>
    );
};
