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
        x: round((port.vertices[0].x - port.position.x) * Math.cos(-port.angle * Math.PI / 180) - (port.vertices[0].y - port.position.y) * Math.sin(-port.angle * Math.PI / 180)),
        y: round((port.vertices[0].x - port.position.x) * Math.sin(-port.angle * Math.PI / 180) + (port.vertices[0].y - port.position.y) * Math.cos(-port.angle * Math.PI / 180))
    } : { x: 40, y: -25 }; // Fallback

    const v2Local = port.vertices ? {
        x: round((port.vertices[1].x - port.position.x) * Math.cos(-port.angle * Math.PI / 180) - (port.vertices[1].y - port.position.y) * Math.sin(-port.angle * Math.PI / 180)),
        y: round((port.vertices[1].x - port.position.x) * Math.sin(-port.angle * Math.PI / 180) + (port.vertices[1].y - port.position.y) * Math.cos(-port.angle * Math.PI / 180))
    } : { x: 40, y: 25 }; // Fallback

    return (
        <g transform={`translate(${port.position.x}, ${port.position.y}) rotate(${port.angle})`}>
            {/* 
         Port Angle points INWARD (Right).
         We want the dock to be OUTSIDE (Left).
      */}

            <g transform="translate(-40, 0)">
                {/* Connection Lines (Ropes) */}
                <line x1="0" y1="0" x2={v1Local.x + 40} y2={v1Local.y} stroke="#8D6E63" strokeWidth="2" />
                <line x1="0" y1="0" x2={v2Local.x + 40} y2={v2Local.y} stroke="#8D6E63" strokeWidth="2" />

                {/* 3D Dock - Triangular Prism */}
                {/* Pointing Right (Inward) */}

                {/* Bottom Face (Shadow) */}
                <path d="M0,0 L-10,-15 L-10,15 Z" fill="#000" opacity="0.2" />

                {/* Side Face (Darker) */}
                <path d="M-10,15 L30,0 L30,-5 L-10,10 Z" fill="#8D6E63" filter="brightness(0.7)" />

                {/* Top Face */}
                <path d="M30,-5 L-10,-20 L-10,10 L30,-5 Z" fill="#D7CCC8" stroke="#5D4037" strokeWidth="1" />

                {/* Resource Icon Standing on Dock */}
                <g transform="translate(0, -5) rotate(90)">
                    <g transform={`rotate(${-port.angle})`}>
                        <ResourceComponent />
                    </g>
                </g>

                {/* Ratio Text on the dock surface */}
                <text x="5" y="0" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#FFF" transform="rotate(-90 5 0)">
                    {port.type === 'generic' ? '3:1' : '2:1'}
                </text>
            </g>
        </g>
    );
};
