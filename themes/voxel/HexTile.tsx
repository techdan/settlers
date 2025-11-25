import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { TerrainType } from '@/core/rules/board-constants';
import { VoxelNumberToken } from './NumberToken';
import { VoxelRobber } from './Robber';
import { VoxelTree, VoxelMountain, VoxelWheat, VoxelBrick, VoxelSheep, VoxelDesert } from './Resources';

interface HexTileProps {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    hasRobber: boolean;
    size: number;
    onClick?: () => void;
    isRolled?: boolean;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
    forest: '#4CAF50', // Brighter Green
    hill: '#D84315', // Deep Orange
    pasture: '#8BC34A', // Light Green
    field: '#FFCA28', // Amber
    mountain: '#78909C', // Blue Grey
    desert: '#FDD835', // Yellow
};

const TERRAIN_COMPONENTS: Record<TerrainType, React.ElementType> = {
    forest: VoxelTree,
    hill: VoxelBrick,
    pasture: VoxelSheep,
    field: VoxelWheat,
    mountain: VoxelMountain,
    desert: VoxelDesert,
};

export const VoxelHexTile: React.FC<HexTileProps> = ({ hex, terrain, numberToken, hasRobber, size, onClick, isRolled }) => {
    const { x, y } = hexToPixel(hex, size);
    const DEPTH = 15;

    // Calculate points for flat hex (Base)
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push({
            x: size * Math.cos(angle_rad),
            y: size * Math.sin(angle_rad)
        });
    }

    // Top face is shifted up by DEPTH
    const topPoints = points.map(p => ({ x: p.x, y: p.y - DEPTH }));
    const topPointsStr = topPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Side Faces (Quads)
    const side1 = [topPoints[0], topPoints[1], points[1], points[0]];
    const side1Str = side1.map(p => `${p.x},${p.y}`).join(' ');

    const side2 = [topPoints[1], topPoints[2], points[2], points[1]];
    const side2Str = side2.map(p => `${p.x},${p.y}`).join(' ');

    const side0 = [topPoints[5], topPoints[0], points[0], points[5]];
    const side0Str = side0.map(p => `${p.x},${p.y}`).join(' ');

    const side3 = [topPoints[2], topPoints[3], points[3], points[2]];
    const side3Str = side3.map(p => `${p.x},${p.y}`).join(' ');

    const ResourceComponent = TERRAIN_COMPONENTS[terrain];
    const baseColor = TERRAIN_COLORS[terrain];

    return (
        <g transform={`translate(${x}, ${y})`} onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
            {/* Defs for gradients/patterns could go here or globally, but for simplicity we use simple fills/filters */}
            <style>
                {`
                    @keyframes flash {
                        0% { filter: brightness(1); }
                        50% { filter: brightness(1.5); }
                        100% { filter: brightness(1); }
                    }
                    .animate-flash {
                        animation: flash 1s ease-in-out 3;
                    }
                `}
            </style>

            {/* Sides (rendered first so they are behind top) */}
            <polygon points={side0Str} fill={baseColor} filter="brightness(0.6)" stroke="none" />
            <polygon points={side3Str} fill={baseColor} filter="brightness(0.8)" stroke="none" />
            <polygon points={side1Str} fill={baseColor} filter="brightness(0.5)" stroke="none" />
            <polygon points={side2Str} fill={baseColor} filter="brightness(0.7)" stroke="none" />

            {/* Top Face */}
            <g>
                <polygon
                    points={topPointsStr}
                    fill={baseColor}
                    stroke="#fff"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    className={`transition-colors hover:brightness-110 ${isRolled ? 'animate-flash' : ''}`}
                />
                {/* Simple texture overlay (noise or pattern could be added here) */}
                <polygon points={topPointsStr} fill="url(#noise)" opacity="0.1" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Content (shifted up by DEPTH) */}
            <g transform={`translate(0, -${DEPTH})`}>
                {/* Resource Icon - Centered and Scaled */}
                <g transform="translate(0, 0) scale(1.5)">
                    <ResourceComponent />
                </g>

                {numberToken && (
                    <g transform={`translate(0, ${size * 0.3})`}>
                        <VoxelNumberToken number={numberToken} />
                    </g>
                )}

                {hasRobber && (
                    <g transform="translate(0, -10)">
                        <VoxelRobber />
                    </g>
                )}
            </g>
        </g>
    );
};
