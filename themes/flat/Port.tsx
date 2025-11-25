import React from 'react';
import { Port, PortType } from '@/types/board';
import { TreePine, Square, Cloud, Wheat, Mountain, HelpCircle } from 'lucide-react';

interface PortProps {
    port: Port;
}

const PORT_ICONS: Record<PortType, React.ElementType> = {
    wood: TreePine,
    brick: Square,
    sheep: Cloud,
    wheat: Wheat,
    ore: Mountain,
    generic: HelpCircle,
};

const PORT_COLORS: Record<PortType, string> = {
    wood: '#228B22',
    brick: '#B22222',
    sheep: '#90EE90',
    wheat: '#DAA520',
    ore: '#708090',
    generic: '#FFFFFF',
};

export const FlatPort: React.FC<PortProps> = ({ port }) => {
    const Icon = PORT_ICONS[port.type];
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

            {/* Icon Circle */}
            <circle cx="0" cy="-6" r="13" fill={color} stroke="#333" strokeWidth="1" />

            {/* Icon */}
            <g transform="translate(-8, -14)">
                <Icon size={16} color={port.type === 'generic' ? '#000' : '#fff'} />
            </g>

            {/* Ratio Text */}
            <text x="0" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">
                {port.type === 'generic' ? '3:1' : '2:1'}
            </text>
        </g>
    );
};
