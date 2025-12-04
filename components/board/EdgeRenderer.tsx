import React from 'react';
import { Edge } from '@/lib/types';
import { createHex, hexEdgeToPixel } from '@/lib/hex';

interface EdgeRendererProps {
    edge: Edge;
    size: number;
    color?: string;
    onClick?: (edgeId: string) => void;
    isValid?: boolean;
    theme?: 'flat' | 'voxel';
}

export const EdgeRenderer: React.FC<EdgeRendererProps> = ({ edge, size, color, onClick, isValid, theme = 'flat' }) => {
    const pixel = hexEdgeToPixel(createHex(edge.q, edge.r), edge.d, size);
    // Edge 0 is vertical (connecting 330 and 30 deg).
    const rotation = 60 * edge.d;
    const DEPTH = 15;
    const offset = theme === 'voxel' ? { x: 0, y: -DEPTH } : { x: 0, y: 0 };

    if (!edge.structure && !isValid) return null;

    return (
        <g transform={`translate(${pixel.x + offset.x}, ${pixel.y + offset.y}) rotate(${rotation})`} onClick={() => onClick?.(edge.id)} className={isValid ? "cursor-pointer" : ""}>
            {/* Hitbox */}
            <rect x={-10} y={-size * 0.35} width={20} height={size * 0.7} fill="transparent" />

            {/* Visual */}
            {edge.structure === 'road' && (
                theme === 'voxel' ? (
                    <g transform="scale(1.5)">
                        {/* 3D Road Segment */}
                        {/* Top Face */}
                        <rect x={-4} y={-size * 0.3} width={8} height={size * 0.6} fill={color || 'gray'} stroke="none" filter="brightness(1.1)" />
                        {/* Side Face (simulated by offset rect) */}
                        <rect x={4} y={-size * 0.3} width={2} height={size * 0.6} fill={color || 'gray'} stroke="none" filter="brightness(0.7)" />
                    </g>
                ) : (
                    <rect x={-4} y={-size * 0.3} width={8} height={size * 0.6} fill={color || 'gray'} stroke="black" strokeWidth={1} />
                )
            )}
            {edge.structure === 'road' && isValid && (
                <rect
                    x={-6}
                    y={-size * 0.32}
                    width={12}
                    height={size * 0.64}
                    fill="none"
                    stroke="rgb(251 191 36)"
                    strokeWidth={2}
                    className="animate-pulse"
                />
            )}
            {!edge.structure && isValid && (
                <rect x={-4} y={-size * 0.25} width={8} height={size * 0.5} fill="rgba(255, 255, 255, 0.6)" stroke="white" strokeWidth={1} className="hover:fill-white transition-colors" />
            )}
        </g>
    );
};
