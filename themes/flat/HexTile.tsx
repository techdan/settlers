import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { TileType } from '@/lib/board-data';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { TreePine, Square, Cloud, Wheat, Mountain, Sun } from 'lucide-react';

interface HexTileProps {
    hex: Hex;
    resource: TileType;
    numberToken: number | null;
    hasRobber: boolean;
    size: number;
    onClick?: () => void;
    isRolled?: boolean;
}

const RESOURCE_COLORS: Record<TileType, string> = {
    wood: '#228B22', // ForestGreen
    brick: '#B22222', // FireBrick
    sheep: '#90EE90', // LightGreen
    wheat: '#DAA520', // GoldenRod
    ore: '#708090', // SlateGray
    desert: '#F4A460', // SandyBrown
};

const RESOURCE_ICONS: Record<TileType, React.ElementType> = {
    wood: TreePine,
    brick: Square, // Placeholder for brick
    sheep: Cloud, // Placeholder for sheep
    wheat: Wheat,
    ore: Mountain,
    desert: Sun,
};

export const HexTile: React.FC<HexTileProps> = ({ hex, resource, numberToken, hasRobber, size, onClick, isRolled }) => {
    const { x, y } = hexToPixel(hex, size);

    // Calculate points for pointy-topped hex
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }
    const pointsStr = points.join(' ');

    const Icon = RESOURCE_ICONS[resource];

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
                fill={RESOURCE_COLORS[resource]}
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
