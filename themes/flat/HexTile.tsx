import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { ResourceType } from '@/lib/board-data';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { TreePine, Square, Cloud, Wheat, Mountain, Sun } from 'lucide-react';

interface HexTileProps {
    hex: Hex;
    resource: ResourceType;
    numberToken: number | null;
    hasRobber: boolean;
    size: number;
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
    wood: '#228B22', // ForestGreen
    brick: '#B22222', // FireBrick
    sheep: '#90EE90', // LightGreen
    wheat: '#DAA520', // GoldenRod
    ore: '#708090', // SlateGray
    desert: '#F4A460', // SandyBrown
};

const RESOURCE_ICONS: Record<ResourceType, React.ElementType> = {
    wood: TreePine,
    brick: Square, // Placeholder for brick
    sheep: Cloud, // Placeholder for sheep
    wheat: Wheat,
    ore: Mountain,
    desert: Sun,
};

export const HexTile: React.FC<HexTileProps> = ({ hex, resource, numberToken, hasRobber, size }) => {
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
        <g transform={`translate(${x}, ${y})`}>
            <polygon
                points={pointsStr}
                fill={RESOURCE_COLORS[resource]}
                stroke="#e5e7eb"
                strokeWidth="4"
                className="transition-colors hover:brightness-110"
            />

            {/* Resource Icon */}
            <g transform="translate(-16, -50)" opacity="0.4">
                <Icon size={32} color="#000" />
            </g>

            {numberToken && (
                <NumberToken number={numberToken} />
            )}

            {hasRobber && <Robber />}
        </g>
    );
};
