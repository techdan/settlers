import React from 'react';
import { Port, PortType } from '@/types/board';
import { HelpCircle } from 'lucide-react';
import { ResourceType } from '@/core/rules/board-constants';
import { RESOURCE_ICON_ID } from '@/components/board/board-icon-defs';
import { PORT_COLORS, BOARD_UI_COLORS } from '@/lib/constants/board-palette';

interface PortProps {
    port: Port;
}

// Map port type to resource type for GameIcon
const PORT_RESOURCE: Record<PortType, ResourceType | null> = {
    wood: 'wood',
    brick: 'brick',
    sheep: 'sheep',
    wheat: 'wheat',
    ore: 'ore',
    generic: null,
};

export const FlatPort: React.FC<PortProps> = ({ port }) => {
    const resourceType = PORT_RESOURCE[port.type];
    const color = PORT_COLORS[port.type];

    // Calculate local coordinates for vertices relative to port position (0,0)
    // Helper to round to 4 decimal places to avoid hydration mismatches
    const round = (n: number) => Math.round(n * 10000) / 10000;

    // Round position coordinates to prevent hydration mismatches
    const posX = round(port.position.x);
    const posY = round(port.position.y);

    const v1Local = port.vertices ? {
        x: round(port.vertices[0].x - port.position.x),
        y: round(port.vertices[0].y - port.position.y)
    } : { x: 0, y: 0 };

    const v2Local = port.vertices ? {
        x: round(port.vertices[1].x - port.position.x),
        y: round(port.vertices[1].y - port.position.y)
    } : { x: 0, y: 0 };

    return (
        <g transform={`translate(${posX}, ${posY})`}>
            {/* Connection Lines to Vertices */}
            <line x1="0" y1="0" x2={v1Local.x} y2={v1Local.y} stroke={BOARD_UI_COLORS.outline} strokeWidth="2" strokeDasharray="4 2" />
            <line x1="0" y1="0" x2={v2Local.x} y2={v2Local.y} stroke={BOARD_UI_COLORS.outline} strokeWidth="2" strokeDasharray="4 2" />

            {/* Background Circle */}
            <circle cx="0" cy="0" r="25" fill={BOARD_UI_COLORS.tokenFace} stroke={BOARD_UI_COLORS.outline} strokeWidth="2" />

            {/* Icon Circle Background */}
            <circle cx="0" cy="-6" r="13" fill={color} stroke={BOARD_UI_COLORS.outline} strokeWidth="1" />

            {/* Circular clip path for icon */}
            <defs>
                <clipPath id={`port-clip-${posX}-${posY}`}>
                    <circle cx="0" cy="-6" r="12" />
                </clipPath>
            </defs>

            {/* Resource Icon or Generic Icon */}
            {resourceType ? (
                <g clipPath={`url(#port-clip-${posX}-${posY})`}>
                    <use
                        href={`#${RESOURCE_ICON_ID[resourceType]}`}
                        x="-12"
                        y="-18"
                        width="24"
                        height="24"
                        className="pointer-events-none"
                    />
                </g>
            ) : (
                <g transform="translate(-8, -14)">
                    <HelpCircle size={16} color={BOARD_UI_COLORS.textDark} />
                </g>
            )}

            {/* Ratio Text */}
            <text x="0" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill={BOARD_UI_COLORS.outline}>
                {port.type === 'generic' ? '3:1' : '2:1'}
            </text>
        </g>
    );
};
