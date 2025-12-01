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
    isMoving?: boolean;
    onCancelMove?: () => void;
    currentPlayerId?: string; // ID of the current player viewing the board
    showCancelIcon?: boolean;
    cancelIconTitle?: string;
    onCancelIconClick?: () => void;
    isSelectedForAction?: boolean;
    highlightVariant?: 'default' | 'treason';
}

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, knight, size, color, onClick, isValid, theme = 'flat', isMoving, onCancelMove, currentPlayerId, showCancelIcon, cancelIconTitle, onCancelIconClick, isSelectedForAction, highlightVariant = 'default' }) => {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, size);
    const DEPTH = 15;
    const offset = theme === 'voxel' ? { x: 0, y: -DEPTH } : { x: 0, y: 0 };

    if (!vertex.structure && !knight && !isValid) return null;

    // Get pastel shade of player color for knights (better contrast)
    const getPastelKnightColor = (playerColor: string): string => {
        const colorMap: Record<string, string> = {
            'red': '#FF6B6B',      // Pastel red
            'blue': '#4DABF7',     // Pastel blue
            'white': '#E9ECEF',    // Light gray
            'orange': '#FFA94D',   // Pastel orange
        };
        return colorMap[playerColor] || '#ADB5BD'; // Default to gray
    };

    // Determine knight color/style based on level
    const getKnightStyle = () => {
        if (!knight) return null;
        const ringColor = knight.active ? '#FFD700' : '#000000'; // Gold for active, Black for inactive
        const levelIndicator = knight.level === 'basic' ? 1 : knight.level === 'strong' ? 2 : 3;
        return { ringColor, levelIndicator };
    };

    const knightStyle = getKnightStyle();

    // Get knight color - use the knight owner's color, not the vertex owner
    const knightColor = knight ? getPastelKnightColor(color || 'gray') : null;

    // Determine if this vertex should show cursor-pointer
    const isOwnKnight = knight && knight.playerId === currentPlayerId;
    const isOwnCity = vertex.owner === currentPlayerId && (vertex.structure === 'city' || vertex.structure === 'metropolis');
    const showPointer = isValid || isOwnKnight || isOwnCity || showCancelIcon;

    return (
        <g transform={`translate(${pixel.x + offset.x}, ${pixel.y + offset.y})`} onClick={() => onClick?.(vertex.id)} className={showPointer ? "cursor-pointer" : ""}>
            {/* Valid Target Indicator (for existing structures like cities) - Rendered FIRST to be behind structure */}
            {vertex.structure && isValid && (
                <circle
                    r={size * 0.4}
                    fill="none"
                    stroke={highlightVariant === 'treason' ? '#e5e7eb' : '#ef4444'}
                    strokeWidth={4}
                    className="animate-pulse pointer-events-none"
                />
            )}

            {isSelectedForAction && (
                <circle
                    r={size * 0.32}
                    fill="none"
                    stroke={highlightVariant === 'treason' ? '#e5e7eb' : '#22d3ee'}
                    strokeWidth={3}
                    className="animate-pulse pointer-events-none"
                />
            )}

            {/* Hitbox - Reduced size for tighter click area */}
            <circle r={size * 0.2} fill="transparent" />

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
                        {/* City Wall - Voxel */}
                        {vertex.hasCityWall && (
                            <g>
                                {/* Wall Base - Dark Brown */}
                                <path d="M0 8 L-13 2 L-13 -4 L0 2 Z" fill="#3f2e22" />
                                <path d="M0 8 L13 2 L13 -4 L0 2 Z" fill="#2a1d15" />
                                {/* Wall Top Lip */}
                                <path d="M0 2 L-13 -4 L0 -10 L13 -4 Z" fill="#5c4033" />
                            </g>
                        )}
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
                    <g>
                        {vertex.hasCityWall && (
                            <rect x={-16} y={-16} width={32} height={32} fill="none" stroke={color || 'gray'} strokeWidth={3} rx={4} />
                        )}
                        <circle r={12} fill={color || 'gray'} stroke="white" strokeWidth={2} />
                    </g>
                )
            )}
            {vertex.structure === 'metropolis' && (
                theme === 'voxel' ? (
                    <g transform="translate(0, -2) scale(2.2)">
                        {/* City Wall - Voxel */}
                        {vertex.hasCityWall && (
                            <g transform="scale(0.9)">
                                {/* Wall Base - Dark Brown */}
                                <path d="M0 9 L-14 3 L-14 -3 L0 3 Z" fill="#3f2e22" />
                                <path d="M0 9 L14 3 L14 -3 L0 3 Z" fill="#2a1d15" />
                                {/* Wall Top Lip */}
                                <path d="M0 3 L-14 -3 L0 -9 L14 -3 Z" fill="#5c4033" />
                            </g>
                        )}
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
                        {vertex.hasCityWall && (
                            <rect x={-20} y={-20} width={40} height={40} fill="none" stroke={color || 'gray'} strokeWidth={3} rx={4} />
                        )}
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
                <g>
                    {/* Tooltip */}
                    <title>
                        {knight.level === 'basic' ? 'Basic' : knight.level === 'strong' ? 'Strong' : 'Mighty'} Knight (Strength {knightStyle.levelIndicator}) - {knight.active ? 'Active' : 'Inactive'}
                    </title>

                    {theme === 'voxel' ? (
                        <g transform="translate(0, -2) scale(1.5)">
                            {/* 3D Knight - Single Wide Body with Multiple Heads */}
                            {(() => {
                                const renderHead = (x: number, y: number, key: number) => (
                                    <g key={key} transform={`translate(${x}, ${y})`}>
                                        {/* Helmet/Head */}
                                        <path d="M0 -2 L-3 -7 L0 -11 L3 -7 Z" fill={knightColor || '#4B5563'} filter="brightness(1.2)" />
                                        {/* Plume/Eye/Indicator */}
                                        <circle r={1.5} cy={-11} fill={knightStyle.ringColor} />
                                    </g>
                                );

                                // Determine body width based on level
                                let bodyWidth = 10;
                                if (knight.level === 'strong') bodyWidth = 18;
                                if (knight.level === 'mighty') bodyWidth = 26;

                                const bodyX = -bodyWidth / 2;

                                return (
                                    <>
                                        {/* Body Base - Rounded Rectangle */}
                                        <rect
                                            x={bodyX}
                                            y={-5}
                                            width={bodyWidth}
                                            height={10}
                                            rx={5}
                                            fill={knightColor || '#4B5563'}
                                            stroke={knightStyle.ringColor}
                                            strokeWidth={1}
                                        />

                                        {/* Heads */}
                                        {knight.level === 'basic' && renderHead(0, 0, 1)}
                                        {knight.level === 'strong' && (
                                            <>
                                                {renderHead(-4, 0, 1)}
                                                {renderHead(4, 0, 2)}
                                            </>
                                        )}
                                        {knight.level === 'mighty' && (
                                            <>
                                                {renderHead(-8, 0, 1)}
                                                {renderHead(0, -1, 2)}
                                                {renderHead(8, 0, 3)}
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </g>
                    ) : (
                        <g transform="translate(0, 0)">
                            {/* Flat Knight - Shield */}
                            <path
                                d="M0 10 L-8 2 L-8 -8 L8 -8 L8 2 Z"
                                fill={knightColor || '#4B5563'}
                                stroke={knightStyle.ringColor}
                                strokeWidth={2}
                            />
                            {/* Level Indicator */}
                            <text x="0" y="2" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                                {knight.level === 'basic' ? '1' : knight.level === 'strong' ? '2' : '3'}
                            </text>
                        </g>
                    )}

                    {/* Cancel Move Button */}
                    {isMoving && (
                        <g transform="translate(15, -15)" className="cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            onCancelMove?.();
                        }}>
                            <circle r={8} fill="#ef4444" stroke="white" strokeWidth={1} />
                            <text x="0" y="3" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">✕</text>
                            <title>Cancel Move</title>
                        </g>
                    )}
                </g>
            )}

            {!vertex.structure && isValid && (
                <circle r={8} fill="rgba(255, 255, 255, 0.5)" className="hover:fill-white transition-colors" />
            )}

            {showCancelIcon && (
                <g
                    transform="translate(18, -18)"
                    className="cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancelIconClick?.();
                    }}
                >
                    <circle r={8} fill="#ef4444" stroke="white" strokeWidth={1} />
                    <text x="0" y="3" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">x</text>
                    <title>{cancelIconTitle || 'Cancel selection'}</title>
                </g>
            )}
        </g>
    );
};
