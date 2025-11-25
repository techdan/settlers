import React from 'react';
import { Port, PortType } from '@/types/board';
import { VoxelTree, VoxelBrick, VoxelSheep, VoxelWheat, VoxelMountain } from './Resources';

interface PortProps {
    port: Port;
}

const VoxelGenericIcon: React.FC = () => (
    <g transform="scale(0.8) translate(0,-10)">
        <circle r="10" fill="#FFF" stroke="#000" strokeWidth="2" />
        <text y="5" textAnchor="middle" fontSize="14" fontWeight="bold">?</text>
    </g>
);

const PORT_COMPONENTS: Record<PortType, React.ElementType> = {
    wood: VoxelTree,
    brick: VoxelBrick,
    sheep: VoxelSheep,
    wheat: VoxelWheat,
    ore: VoxelMountain,
    generic: VoxelGenericIcon,
};

export const VoxelPort: React.FC<PortProps> = ({ port }) => {
    const ResourceComponent = PORT_COMPONENTS[port.type];

    // Helper to round to 4 decimal places to avoid hydration mismatches
    const round = (n: number) => Math.round(n * 10000) / 10000;

    // Calculate local coordinates for vertices relative to port position (0,0)
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
            {/* Connection Lines (Ropes) */}
            {/* Connect to the "top" of the hex (y - 15) to simulate height (DEPTH=15) */}
            <line x1="0" y1="0" x2={v1Local.x} y2={v1Local.y - 15} stroke="#8D6E63" strokeWidth="2" />
            <line x1="0" y1="0" x2={v2Local.x} y2={v2Local.y - 15} stroke="#8D6E63" strokeWidth="2" />

            {/* 3D Platform/Crate */}
            <g transform="translate(-24, -24)">
                {/* Shadow/Side */}
                <path d="M0,48 L48,48 L48,10 L0,10 Z" fill="#5D4037" />
                <path d="M48,48 L53,43 L53,5 L48,10 Z" fill="#3E2723" />

                {/* Top Face */}
                <rect x="0" y="0" width="48" height="48" fill="#D7CCC8" stroke="#5D4037" strokeWidth="1" />

                {/* Resource Icon */}
                <g transform="translate(24, 24)">
                    <ResourceComponent />
                </g>

                {/* Ratio Text */}
                <text x="24" y="42" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#3E2723">
                    {port.type === 'generic' ? '3:1' : '2:1'}
                </text>
            </g>
        </g>
    );
};
