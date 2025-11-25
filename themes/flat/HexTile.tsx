import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { TerrainType } from '@/core/rules/board-constants';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { TreePine, Square, Cloud, Wheat, Mountain, Sun } from 'lucide-react';

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
    forest: '#228B22', // ForestGreen
    hill: '#B22222', // FireBrick
    pasture: '#90EE90', // LightGreen
    field: '#DAA520', // GoldenRod
    mountain: '#708090', // SlateGray
    desert: '#F4A460', // SandyBrown
};

const TERRAIN_ICONS: Record<TerrainType, React.ElementType> = {
    forest: TreePine,
    hill: Square, // Placeholder for brick
    pasture: Cloud, // Placeholder for sheep
    field: Wheat,
    mountain: Mountain,
    desert: Sun,
};

export const HexTile: React.FC<HexTileProps> = ({ hex, terrain, numberToken, hasRobber, size, onClick, isRolled }) => {
    const { x, y } = hexToPixel(hex, size);

    // Calculate points for pointy-topped hex
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }
    const pointsStr = points.join(' ');

    const Icon = TERRAIN_ICONS[terrain];

    return (
        <g transform={`translate(${x}, ${y})`} onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
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
            <polygon
                points={pointsStr}
                fill={TERRAIN_COLORS[terrain]}
                stroke="#e5e7eb"
                strokeWidth="4"
                className={`transition-colors hover:brightness-110 ${isRolled ? 'animate-flash' : ''}`}
            />

            {/* Resource Icon */}
            <g transform="translate(-16, -50)" opacity="0.4">
                <Icon size={32} color="#000" />
            </g>

            {numberToken && (
                <g transform={`translate(0, ${size * 0.3})`}>
                    <NumberToken number={numberToken} />
                </g>
            )}

            {hasRobber && <Robber />}
        </g>
    );
};
