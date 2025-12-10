import React from 'react';
import { Port, PortType } from '@/types/board';
import { HelpCircle } from 'lucide-react';
import { ResourceType } from '@/core/rules/board-constants';
import { GameIcon } from '@/components/ui/icons/GameIcon';

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

// Background colors for the icon circle (using resource icon backgrounds from icons.md)
const PORT_COLORS: Record<PortType, string> = {
    wood: '#06740E',    // Forest green
    brick: '#ca7728',   // Hills orange-brown
    sheep: '#84b83f',   // Pasture green
    wheat: '#f9e26f',   // Fields yellow
    ore: '#666d63',     // Mountain grey
    generic: '#FFFFFF', // White for generic
};

export const FlatPort: React.FC<PortProps> = ({ port }) => {
    const resourceType = PORT_RESOURCE[port.type];
    const color = PORT_COLORS[port.type];

    // Calculate local coordinates for vertices relative to port position (0,0)
    // Helper to round to 4 decimal places to avoid hydration mismatches
    const round = (n: number) => Math.round(n * 10000) / 10000;

    const v1Local = port.vertices ? {
        x: round(port.vertices[0].x - port.position.x),
        y: round(port.vertices[0].y - port.position.y)
    } : { x: 0, y: 0 };

    const v2Local = port.vertices ? {
        x: round(port.vertices[1].x - port.position.x),
        y: round(port.vertices[1].y - port.position.y)
    } : { x: 0, y: 0 };

    return (
        <g transform={`translate(${port.position.x}, ${port.position.y})`}>
            {/* Connection Lines to Vertices */}
            <line x1="0" y1="0" x2={v1Local.x} y2={v1Local.y} stroke="#333" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="0" y1="0" x2={v2Local.x} y2={v2Local.y} stroke="#333" strokeWidth="2" strokeDasharray="4 2" />

            {/* Background Circle */}
            <circle cx="0" cy="0" r="25" fill="#F5F5DC" stroke="#333" strokeWidth="2" />

            {/* Icon Circle Background */}
            <circle cx="0" cy="-6" r="13" fill={color} stroke="#333" strokeWidth="1" />

            {/* Circular clip path for icon */}
            <defs>
                <clipPath id={`port-clip-${port.position.x}-${port.position.y}`}>
                    <circle cx="0" cy="-6" r="12" />
                </clipPath>
            </defs>

            {/* Resource Icon or Generic Icon */}
            {resourceType ? (
                <g clipPath={`url(#port-clip-${port.position.x}-${port.position.y})`}>
                    <foreignObject x="-13" y="-19" width="26" height="26">
                        <div style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GameIcon type={resourceType} size={24} />
                        </div>
                    </foreignObject>
                </g>
            ) : (
                <g transform="translate(-8, -14)">
                    <HelpCircle size={16} color="#000" />
                </g>
            )}

            {/* Ratio Text */}
            <text x="0" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">
                {port.type === 'generic' ? '3:1' : '2:1'}
            </text>
        </g>
    );
};
