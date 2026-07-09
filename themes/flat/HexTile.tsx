import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { Merchant } from './Merchant';
import { RESOURCE_ICON_ID, DESERT_ICON_ID } from '@/components/board/board-icon-defs';
import { TERRAIN_COLORS, HEX_TILE_STROKE } from '@/lib/constants/board-palette';

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
    const iconX = -iconSize / 2;
    const iconY = -size * 0.8;
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
            <polygon
                points={pointsStr}
                fill={TERRAIN_COLORS[terrain]}
                stroke={shouldGlow ? HEX_TILE_STROKE.selectable : HEX_TILE_STROKE.default}
                strokeWidth={shouldGlow ? "6" : "4"}
                className={`transition-all ${isSelectable ? 'hover:brightness-110' : ''} ${isRolled ? 'animate-flash' : ''} ${shouldGlow ? 'animate-pulse-valid' : ''}`}
            />

            {/* Resource Icon */}
            {resourceType && (
                <use
                    href={`#${RESOURCE_ICON_ID[resourceType]}`}
                    x={iconX}
                    y={iconY}
                    width={iconSize}
                    height={iconSize}
                    opacity={0.6}
                    className="pointer-events-none"
                />
            )}
            {/* Desert icon */}
            {terrain === 'desert' && (
                <use
                    href={`#${DESERT_ICON_ID}`}
                    x={iconX}
                    y={iconY}
                    width={iconSize}
                    height={iconSize}
                    opacity={0.6}
                    className="pointer-events-none"
                />
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
