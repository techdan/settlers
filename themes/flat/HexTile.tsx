import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { Merchant } from './Merchant';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface HexTileProps {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    hasRobber: boolean;
    hasMerchant?: boolean;
    merchantColor?: string;
    size: number;
    onClick?: () => void;
    isRolled?: boolean;
    isSelectable?: boolean;
    selectionVariant?: 'glow' | 'cursor';
    selectionState?: 'primary' | 'secondary' | null;
}

// Hex tile background colors from icons.md (resource icon backgrounds)
const TERRAIN_COLORS: Record<TerrainType, string> = {
    forest: '#06740E',  // Forest green (wood)
    hill: '#ca7728',    // Hills orange-brown (brick)
    pasture: '#84b83f', // Pasture green (sheep)
    field: '#f9e26f',   // Fields yellow (wheat)
    mountain: '#666d63', // Mountain grey (ore)
    desert: '#e4c27c',  // Desert tan
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
    merchantColor,
    size,
    onClick,
    isRolled,
    isSelectable,
    selectionVariant = 'glow',
    selectionState = null
}) => {
    const { x, y } = hexToPixel(hex, size);
    const shouldGlow = !!isSelectable && selectionVariant === 'glow';
    const iconSize = Math.max(24, Math.round(size * 0.6));
    const iconTranslate = `translate(${-iconSize / 2}, ${-size * 0.8})`;
    const tokenRadius = Math.max(12, Math.round(size * 0.28));

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
                <g transform={iconTranslate}>
                    <foreignObject width={iconSize} height={iconSize} style={{ opacity: 0.6 }}>
                        <div style={{ width: `${iconSize}px`, height: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GameIcon type={resourceType} size={iconSize} />
                        </div>
                    </foreignObject>
                </g>
            )}
            {/* Desert icon */}
            {terrain === 'desert' && (
                <g transform={iconTranslate}>
                    <foreignObject width={iconSize} height={iconSize} style={{ opacity: 0.6 }}>
                        <div style={{ width: `${iconSize}px`, height: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/icons/cactus-colored.svg" alt="Desert" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
                        </div>
                    </foreignObject>
                </g>
            )}

            {numberToken && (
                <g transform={`translate(0, ${size * 0.3})`}>
                    <NumberToken
                        number={numberToken}
                        highlight={selectionState ?? undefined}
                        radius={tokenRadius}
                    />
                </g>
            )}

            {hasRobber && (
                <g transform={hasMerchant ? 'translate(-12, 0)' : undefined}>
                    <Robber />
                </g>
            )}
            {hasMerchant && (
                <g transform={hasRobber ? 'translate(12, 0)' : undefined}>
                    <Merchant color={merchantColor} />
                </g>
            )}
        </g>
    );
};
