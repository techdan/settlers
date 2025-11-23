import React from 'react';
import { Vertex } from '@/lib/game-types';
import { createHex, hexCornerToPixel } from '@/lib/hex';

interface VertexRendererProps {
    vertex: Vertex;
    size: number;
    color?: string; // Color of the owner
    onClick?: (vertexId: string) => void;
    isValid?: boolean;
    theme?: 'flat' | 'voxel';
}

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, size, color, onClick, isValid, theme = 'flat' }) => {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, size);
    const DEPTH = 15;
    const offset = theme === 'voxel' ? { x: 0, y: -DEPTH } : { x: 0, y: 0 };

    if (!vertex.structure && !isValid) return null;

    return (
        <g transform={`translate(${pixel.x + offset.x}, ${pixel.y + offset.y})`} onClick={() => onClick?.(vertex.id)} className={isValid ? "cursor-pointer" : ""}>
            {/* Hitbox */}
            <circle r={size * 0.25} fill="transparent" />

            {/* Visual */}
            {vertex.structure === 'settlement' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2)">
                        {/* 3D Settlement (House) - Convex Corner Facing Viewer */}

                        {/* Left Face */}
                        <path d="M0 4 L-8 0 L-8 -10 L0 -6 Z" fill={color || 'gray'} filter="brightness(0.7)" stroke="none" />
                        {/* Right Face */}
                        <path d="M0 4 L8 0 L8 -10 L0 -6 Z" fill={color || 'gray'} filter="brightness(0.5)" stroke="none" />

                        {/* Roof Left */}
                        <path d="M0 -6 L-8 -10 L0 -16 Z" fill={color || 'gray'} filter="brightness(1.1)" stroke="none" />
                        {/* Roof Right */}
                        <path d="M0 -6 L8 -10 L0 -16 Z" fill={color || 'gray'} filter="brightness(0.9)" stroke="none" />
                    </g>
                ) : (
                    <rect x={-10} y={-10} width={20} height={20} fill={color || 'gray'} stroke="white" strokeWidth={2} />
                )
            )}
            {vertex.structure === 'city' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2)">
                        {/* 3D City - Base + Tower */}

                        {/* Base Left Face */}
                        <path d="M0 5 L-10 0 L-10 -8 L0 -3 Z" fill={color || 'gray'} filter="brightness(0.7)" />
                        {/* Base Right Face */}
                        <path d="M0 5 L10 0 L10 -8 L0 -3 Z" fill={color || 'gray'} filter="brightness(0.5)" />
                        {/* Base Top */}
                        <path d="M0 -3 L-10 -8 L0 -13 L10 -8 Z" fill={color || 'gray'} filter="brightness(0.9)" />

                        {/* Tower (Back Right) */}
                        <g transform="translate(5, -5)">
                            {/* Tower Left Face */}
                            <path d="M0 0 L-5 -2.5 L-5 -12.5 L0 -10 Z" fill={color || 'gray'} filter="brightness(0.8)" />
                            {/* Tower Right Face */}
                            <path d="M0 0 L5 -2.5 L5 -12.5 L0 -10 Z" fill={color || 'gray'} filter="brightness(0.6)" />
                            {/* Tower Roof */}
                            <path d="M0 -10 L-5 -12.5 L0 -17.5 L5 -12.5 Z" fill={color || 'gray'} filter="brightness(1.2)" />
                        </g>
                    </g>
                ) : (
                    <circle r={12} fill={color || 'gray'} stroke="white" strokeWidth={2} />
                )
            )}
            {!vertex.structure && isValid && (
                <circle r={8} fill="rgba(255, 255, 255, 0.5)" className="hover:fill-white transition-colors" />
            )}
        </g>
    );
};
