import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { TerrainType } from '@/core/rules/board-constants';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { Sun } from 'lucide-react';
import { Merchant } from './Merchant';
import { GameIcon, ResourceType } from '@/components/ui/icons/GameIcon';

interface HexTileProps {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    hasRobber: boolean;
    hasMerchant?: boolean;
    size: number;
    onClick?: () => void;
    isRolled?: boolean;
    isSelectable?: boolean;
    selectionVariant?: 'glow' | 'cursor';
    selectionState?: 'primary' | 'secondary' | null;
}

// Hex tile background colors from icons.md (resource icon backgrounds)
const TERRAIN_COLORS: Record<TerrainType, string> = {
    forest: '#006636',  // Forest green (wood)
    hill: '#ca7728',    // Hills orange-brown (brick)
    pasture: '#84b83f', // Pasture green (sheep)
    field: '#f9e26f',   // Fields yellow (wheat)
    mountain: '#666d63', // Mountain grey (ore)
    desert: '#F4A460',  // SandyBrown
};

// Map terrain to resource icons
const TERRAIN_RESOURCE: Record<TerrainType, ResourceType | null> = {
    forest: 'wood',
    hill: 'brick',
    pasture: 'sheep',
    field: 'wheat',
    mountain: 'ore',
    desert: null, // Desert has no resource
};

export const HexTile: React.FC<HexTileProps> = ({
    hex,
    terrain,
    numberToken,
    hasRobber,
    hasMerchant,
    size,
    onClick,
    isRolled,
    isSelectable,
    selectionVariant = 'glow',
    selectionState = null
}) => {
    const { x, y } = hexToPixel(hex, size);
    const shouldGlow = !!isSelectable && selectionVariant === 'glow';

    // Calculate points for pointy-topped hex
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }
    const pointsStr = points.join(' ');

    const resourceType = TERRAIN_RESOURCE[terrain];

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onClick={isSelectable ? onClick : undefined}
            className={isSelectable ? "cursor-pointer" : ""}
        >
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
                    @keyframes pulse-valid {
                        0% { stroke-width: 4; stroke: #4ade80; }
                        50% { stroke-width: 8; stroke: #22c55e; }
                        100% { stroke-width: 4; stroke: #4ade80; }
                    }
                    .animate-pulse-valid {
                        animation: pulse-valid 2s infinite;
                    }
                `}
            </style>
            <polygon
                points={pointsStr}
                fill={TERRAIN_COLORS[terrain]}
                stroke={shouldGlow ? "#4ade80" : "#e5e7eb"}
                strokeWidth={shouldGlow ? "6" : "4"}
                className={`transition-all ${isSelectable ? 'hover:brightness-110' : ''} ${isRolled ? 'animate-flash' : ''} ${shouldGlow ? 'animate-pulse-valid' : ''}`}
            />

            {/* Resource Icon */}
            {resourceType && (
                <g transform="translate(-24, -60)">
                    <foreignObject width="48" height="48" style={{ opacity: 0.6 }}>
                        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GameIcon type={resourceType} size={48} />
                        </div>
                    </foreignObject>
                </g>
            )}
            {/* Desert icon */}
            {terrain === 'desert' && (
                <g transform="translate(-16, -50)" opacity="0.4">
                    <Sun size={32} color="#000" />
                </g>
            )}

            {numberToken && (
                <g transform={`translate(0, ${size * 0.3})`}>
                    <NumberToken number={numberToken} highlight={selectionState ?? undefined} />
                </g>
            )}

            {hasRobber && <Robber />}
            {hasMerchant && <Merchant />}
        </g>
    );
};
