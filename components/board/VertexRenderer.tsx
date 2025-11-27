import React from 'react';
import { Vertex } from '@/lib/types';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { Knight } from '@/lib/types/player';

interface VertexRendererProps {
    vertex: Vertex;
    knight?: Knight;
    size: number;
    color?: string; // Color of the owner
    onClick?: (vertexId: string) => void;
    isValid?: boolean;
    theme?: 'flat' | 'voxel';
}

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, knight, size, color, onClick, isValid, theme = 'flat' }) => {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, size);
    const DEPTH = 15;
    const offset = theme === 'voxel' ? { x: 0, y: -DEPTH } : { x: 0, y: 0 };

    if (!vertex.structure && !knight && !isValid) return null;

    // Determine knight color/style based on level
    const getKnightStyle = () => {
        if (!knight) return null;
        const ringColor = knight.active ? '#FFD700' : '#000000'; // Gold for active, Black for inactive
        const levelIndicator = knight.level === 'basic' ? 1 : knight.level === 'strong' ? 2 : 3;
        return { ringColor, levelIndicator };
    };

    const knightStyle = getKnightStyle();

    return (
        <g transform={`translate(${pixel.x + offset.x}, ${pixel.y + offset.y})`} onClick={() => onClick?.(vertex.id)} className={isValid ? "cursor-pointer" : ""}>
            {/* Hitbox */}
            <circle r={size * 0.35} fill="transparent" />

            {/* Visual - Building */}
            {vertex.structure === 'settlement' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2)">
                        {/* 3D Settlement (House) */}
                        <path d="M0 4 L-8 0 L-8 -10 L0 -6 Z" fill={color || 'gray'} filter="brightness(0.7)" stroke="none" />
                        <path d="M0 4 L8 0 L8 -10 L0 -6 Z" fill={color || 'gray'} filter="brightness(0.5)" stroke="none" />
                        <path d="M0 -6 L-8 -10 L0 -16 Z" fill={color || 'gray'} filter="brightness(1.1)" stroke="none" />
                        <path d="M0 -6 L8 -10 L0 -16 Z" fill={color || 'gray'} filter="brightness(0.9)" stroke="none" />
                    </g>
                ) : (
                    <rect x={-10} y={-10} width={20} height={20} fill={color || 'gray'} stroke="white" strokeWidth={2} />
                )
            )}
            {vertex.structure === 'city' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2)">
                        {/* 3D City */}
                        <path d="M0 5 L-10 0 L-10 -8 L0 -3 Z" fill={color || 'gray'} filter="brightness(0.7)" />
                        <path d="M0 5 L10 0 L10 -8 L0 -3 Z" fill={color || 'gray'} filter="brightness(0.5)" />
                        <path d="M0 -3 L-10 -8 L0 -13 L10 -8 Z" fill={color || 'gray'} filter="brightness(0.9)" />
                        <g transform="translate(5, -5)">
                            <path d="M0 0 L-5 -2.5 L-5 -12.5 L0 -10 Z" fill={color || 'gray'} filter="brightness(0.8)" />
                            <path d="M0 0 L5 -2.5 L5 -12.5 L0 -10 Z" fill={color || 'gray'} filter="brightness(0.6)" />
                            <path d="M0 -10 L-5 -12.5 L0 -17.5 L5 -12.5 Z" fill={color || 'gray'} filter="brightness(1.2)" />
                        </g>
                    </g>
                ) : (
                    <circle r={12} fill={color || 'gray'} stroke="white" strokeWidth={2} />
                )
            )}
            {vertex.structure === 'metropolis' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2.2)">
                        {/* 3D Metropolis */}
                        <path d="M0 6 L-12 1 L-12 -6 L0 -1 Z" fill={color || 'gray'} filter="brightness(0.7)" />
                        <path d="M0 6 L12 1 L12 -6 L0 -1 Z" fill={color || 'gray'} filter="brightness(0.5)" />
                        <path d="M0 -1 L-12 -6 L0 -11 L12 -6 Z" fill={color || 'gray'} filter="brightness(0.9)" />
                        <g transform="translate(0, -11)">
                            <path d="M0 0 L-8 -3 L-8 -8 L0 -5 Z" fill={color || 'gray'} filter="brightness(0.8)" />
                            <path d="M0 0 L8 -3 L8 -8 L0 -5 Z" fill={color || 'gray'} filter="brightness(0.6)" />
                            <path d="M0 -5 L-8 -8 L0 -11 L8 -8 Z" fill={color || 'gray'} filter="brightness(1.0)" />
                        </g>
                        <g transform="translate(0, -22)">
                            <path d="M0 0 L-5 -2 L-5 -6 L0 -4 Z" fill="#FFD700" filter="brightness(0.9)" />
                            <path d="M0 0 L5 -2 L5 -6 L0 -4 Z" fill="#FFD700" filter="brightness(0.7)" />
                            <path d="M0 -4 L-5 -6 L0 -8 L5 -6 Z" fill="#FFD700" filter="brightness(1.2)" />
                            <path d="M0 -8 L-2 -10 L0 -14 L2 -10 Z" fill="#FFD700" filter="brightness(1.3)" />
                        </g>
                    </g>
                ) : (
                    <g>
                        <circle r={16} fill={color || 'gray'} stroke="#FFD700" strokeWidth={3} />
                        <path
                            d="M-8 -18 L-6 -22 L-4 -18 L-2 -22 L0 -18 L2 -22 L4 -18 L6 -22 L8 -18"
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </g>
                )
            )}

            {/* Visual - Knight */}
            {knight && knightStyle && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(1.5)">
                        {/* 3D Knight - Helmet/Shield representation */}
                        {/* Base */}
                        <circle r={5} fill={color || 'gray'} stroke={knightStyle.ringColor} strokeWidth={1} />
                        {/* Helmet */}
                        <path d="M0 -2 L-4 -8 L0 -12 L4 -8 Z" fill={color || 'gray'} filter="brightness(1.2)" />
                        {/* Plume/Level Indicator */}
                        {knight.level === 'basic' && <circle r={1} cy={-12} fill={knightStyle.ringColor} />}
                        {knight.level === 'strong' && <rect x={-2} y={-13} width={4} height={2} fill={knightStyle.ringColor} />}
                        {knight.level === 'mighty' && <path d="M0 -12 L-3 -15 L3 -15 Z" fill={knightStyle.ringColor} />}
                    </g>
                ) : (
                    <g transform="translate(0, 0)">
                        {/* Flat Knight - Shield */}
                        <path
                            d="M0 10 L-8 2 L-8 -8 L8 -8 L8 2 Z"
                            fill={color || 'gray'}
                            stroke={knightStyle.ringColor}
                            strokeWidth={2}
                        />
                        {/* Level Indicator */}
                        <text x="0" y="2" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                            {knight.level === 'basic' ? '1' : knight.level === 'strong' ? '2' : '3'}
                        </text>
                    </g>
                )
            )}

            {!vertex.structure && !knight && isValid && (
                <circle r={8} fill="rgba(255, 255, 255, 0.5)" className="hover:fill-white transition-colors" />
            )}
        </g>
    );
};
