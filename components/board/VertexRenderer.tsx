import React from 'react';
import { Vertex } from '@/lib/types';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { Knight } from '@/lib/types/player';
import { VoxelKnight } from '@/themes/voxel/Knight';

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
    isPendingPlacement?: boolean;
    onConfirmPlacement?: () => void;
    onCancelPlacement?: () => void;
}

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, knight, size, color, onClick, isValid, theme = 'flat', isMoving, onCancelMove, currentPlayerId, showCancelIcon, cancelIconTitle, onCancelIconClick, isSelectedForAction, highlightVariant = 'default', isPendingPlacement, onConfirmPlacement, onCancelPlacement }) => {
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

    // Determine if this vertex should show cursor-pointer
    const isOwnKnight = knight && knight.playerId === currentPlayerId;
    const isOwnCity = vertex.owner === currentPlayerId && (vertex.structure === 'city' || vertex.structure === 'metropolis');
    const isOwnSettlement = vertex.owner === currentPlayerId && vertex.structure === 'settlement';
    const showPointer = isValid || isOwnKnight || isOwnCity || isOwnSettlement || showCancelIcon;

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
                    <svg x={-12} y={-12} width={24} height={24} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}>
                        <defs>
                            <linearGradient id={`settlement-grad-${vertex.id}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={color || 'gray'} stopOpacity="1" />
                                <stop offset="100%" stopColor={color || 'gray'} stopOpacity="0.7" />
                            </linearGradient>
                        </defs>
                        <path d="M0 0h512v512H0z" fill={`url(#settlement-grad-${vertex.id})`} />
                        <path d="m109.902 35.87-71.14 59.284h142.28l-71.14-59.285zm288 32-71.14 59.284h142.28l-71.14-59.285zM228.73 84.403l-108.9 90.75h217.8l-108.9-90.75zm-173.828 28.75v62h36.81l73.19-60.992v-1.008h-110zm23 14h16v18h-16v-18zm265 18v10.963l23 19.166v-16.13h16v18h-13.756l.104.087 19.098 15.914h-44.446v14h78v-39h18v39h14v-62h-110zm-194.345 48v20.08l24.095-20.08h-24.095zm28.158 0 105.1 87.582 27.087-22.574v-65.008H176.715zm74.683 14h35.735v34h-35.735v-34zm-76.714 7.74L30.37 335.153H319l-144.314-120.26zm198.046 13.51-76.857 64.047 32.043 26.704H481.63l-108.9-90.75zm-23.214 108.75.103.086 19.095 15.914h-72.248v77.467h60.435v-63.466h50v63.467h46v-93.466H349.516zm-278.614 16V476.13h126v-76.976h50v76.977h31.565V353.155H70.902zm30 30h50v50h-50v-50z" fill="#fff" />
                    </svg>
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
                    <>
                        {vertex.hasCityWall && (
                            <rect
                                x={-18}
                                y={-18}
                                width={36}
                                height={36}
                                fill="none"
                                stroke="#5c4033"
                                strokeWidth={4}
                                rx={4}
                                style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}
                            />
                        )}
                        <svg x={-14} y={-14} width={28} height={28} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}>
                            <defs>
                                <linearGradient id={`city-grad-${vertex.id}`} x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor={color || 'gray'} stopOpacity="1" />
                                    <stop offset="100%" stopColor={color || 'gray'} stopOpacity="0.7" />
                                </linearGradient>
                            </defs>
                            <path d="M0 0h512v512H0z" fill={`url(#city-grad-${vertex.id})`} />
                            <path fill="#fff" d="M255.95 27.11L180.6 107.614l150.7 1.168-75.35-81.674h-.003zM25 109.895v68.01l19.412 25.99h71.06l19.528-26v-68h-14v15.995h-18v-15.994H89v15.995H71v-15.994H57v15.995H39v-15.994H25zm352 0v68l19.527 26h71.06L487 177.906v-68.01h-14v15.995h-18v-15.994h-14v15.995h-18v-15.994h-14v15.995h-18v-15.994h-14zm-176 15.877V260.89h110V126.63l-110-.857zm55 20.118c8 0 16 4 16 12v32h-32v-32c0-8 8-12 16-12zM41 221.897V484.89h78V221.897H41zm352 0V484.89h78V221.897h-78zM56 241.89c4 0 8 4 8 12v32H48v-32c0-8 4-12 8-12zm400 0c4 0 8 4 8 12v32h-16v-32c0-8 4-12 8-12zm-303 37v23h-16v183h87v-55c0-24 16-36 32-36s32 12 32 36v55h87v-183h-16v-23h-14v23h-18v-23h-14v23h-18v-23h-14v23h-18v-23h-14v23h-18v-23h-14v23h-18v-23h-14zm-49 43c4 0 8 4 8 12v32H96v-32c0-8 4-12 8-12zm72 0c8 0 16 4 16 12v32h-32v-32c0-8 8-12 16-12zm80 0c8 0 16 4 16 12v32h-32v-32c0-8 8-12 16-12zm80 0c8 0 16 4 16 12v32h-32v-32c0-8 8-12 16-12zm72 0c4 0 8 4 8 12v32h-16v-32c0-8 4-12 8-12zm-352 64c4 0 8 4 8 12v32H48v-32c0-8 4-12 8-12zm400 0c4 0 8 4 8 12v32h-16v-32c0-8 4-12 8-12z" />
                        </svg>
                    </>
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
                    <>
                        {vertex.hasCityWall && (
                            <rect
                                x={-22}
                                y={-22}
                                width={44}
                                height={44}
                                fill="none"
                                stroke="#5c4033"
                                strokeWidth={4}
                                rx={6}
                                style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}
                            />
                        )}
                        <svg x={-16} y={-16} width={32} height={32} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}>
                            <defs>
                                <linearGradient id={`metropolis-grad-${vertex.id}`} x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor={color || 'gray'} stopOpacity="1" />
                                    <stop offset="100%" stopColor={color || 'gray'} stopOpacity="0.7" />
                                </linearGradient>
                            </defs>
                            <path d="M0 0h512v512H0z" fill={`url(#metropolis-grad-${vertex.id})`} />
                            <path fill="#fff" d="M256 21c-66.72 0-121 54.28-121 121s54.28 121 121 121 121-54.28 121-121S322.72 21 256 21zm0 18c56.992 0 103 46.008 103 103s-46.008 103-103 103-103-46.008-103-103S199.008 39 256 39zm0 11.75l-69.4 52.05 10.8 14.4L256 73.25l58.6 43.95 10.8-14.4L256 50.75zm0 48l-69.4 52.05 10.8 14.4 58.6-43.95 58.6 43.95 10.8-14.4L256 98.75zm0 48l-69.4 52.05 10.8 14.4 58.6-43.95 58.6 43.95 10.8-14.4-69.4-52.05zM53.562 185l-7 14h66.876l-7-14H53.562zm352 0l-7 14h66.875l-7-14h-52.875zM41 217v46h78v-46H41zm352 0v46h78v-46h-78zM64 231h32v18H64v-18zm352 0h32v18h-32v-18zM38.486 281l-10 30h455.028l-10-30H38.486zM25 329v158h199v-87h64v87h199V329H25zm55 14h32v18H80v-18zm80 0h32v18h-32v-18zm80 0h32v18h-32v-18zm80 0h32v18h-32v-18zm80 0h32v18h-32v-18z" />
                        </svg>
                    </>
                )
            )}

            {/* Visual - Knight */}
            {knight && knightStyle && (
                theme === 'voxel' ? (
                    <VoxelKnight knight={knight} color={color || 'gray'} />
                ) : (
                    <g>
                        {/* Tooltip - transparent rect that can receive hover events */}
                        <rect x={-12} y={-12} width={24} height={24} fill="transparent" pointerEvents="all">
                            <title>{knight.level === 'basic' ? 'Basic' : knight.level === 'strong' ? 'Strong' : 'Mighty'} Knight (Strength {knightStyle.levelIndicator}) - {knight.active ? 'Active' : 'Inactive'}</title>
                        </rect>

                        {/* Inline SVG with dynamic player color - use fillOpacity instead of SVG opacity */}
                        {knight.level === 'basic' && (
                            <svg x={-12} y={-12} width={24} height={24} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5)) ${knight.active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))' : ''}` }}>
                                {/* Solid color background - player color matches roads/settlements */}
                                <path d="M0 0h512v512H0z" fill={color || 'gray'} fillOpacity={knight.active ? 1 : 0.5} />
                                {/* White foreground icon */}
                                <path fill="#fff" fillOpacity={knight.active ? 1 : 0.5} d="M233 25v158h46V25h-46zm-18 21.74c-25.1 7.53-44.9 22.05-60 40.88-20.7 25.88-32 60.28-33.7 95.38H215V46.74zm82 0V183h93.7c-1.7-35.1-13-69.5-33.7-95.38-15.1-18.83-34.9-33.35-60-40.88zM105 201v30h302v-30H105zm16.8 48c4 23.2 23.2 41.6 48.4 55.1 18.6 9.8 40 16.6 58.8 20.1v-15.3c-13.7-3.7-28.4-9.7-42.2-17-11.8-6.3-22.8-13.6-31.1-22.1-6.1-6.1-11-13.1-13.3-20.8h-20.6zm125.2 0v78h18v-78h-18zm122.6 0c-2.3 7.7-7.2 14.7-13.3 20.8-8.3 8.5-19.3 15.8-31.1 22.1-13.8 7.3-28.5 13.3-42.2 17v15.3c18.8-3.5 40.2-10.3 58.8-20.1 25.2-13.5 44.4-31.9 48.4-55.1h-20.6zm-252.8 33.3c-5.7 54.2-16.7 105.9-27.63 150.1.19.2 1.82 5.3 6.06 11 4.51 6.1 11.17 13.2 18.67 19.8 11.7 10.2 25.9 18.8 37.1 22.2V313.6c-13.5-8.5-25.6-18.9-34.2-31.3zm278.4 0c-8.6 12.4-20.7 22.8-34.2 31.3v171.8c11.2-3.4 25.4-12 37.1-22.2 7.5-6.6 14.2-13.7 18.7-19.8 4.2-5.7 5.8-10.8 6-11-11-44.2-21.9-95.9-27.6-150.1zM256 379c-20.3 0-40.6 1-58.1 3.1-10.9 1.3-20.7 2.8-28.9 5.1v18.9c7.1-2.4 18.2-4.6 31.1-6.2 16.5-1.9 36.2-2.9 55.9-2.9 19.7 0 39.4 1 55.9 2.9 12.9 1.6 24 3.8 31.1 6.2v-18.9c-8.2-2.3-18-3.8-28.9-5.1-17.5-2.1-37.8-3.1-58.1-3.1z" />
                            </svg>
                        )}
                        {knight.level === 'strong' && (
                            <svg x={-12} y={-12} width={24} height={24} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5)) ${knight.active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))' : ''}` }}>
                                <path d="M0 0h512v512H0z" fill={color || 'gray'} fillOpacity={knight.active ? 1 : 0.5} />
                                <path fill="#fff" fillOpacity={knight.active ? 1 : 0.5} d="M256 16c-36.446 0-73.264 13.433-139.97 40h279.94C329.263 29.433 292.445 16 256 16zM95.344 72 64 448c56 28 112 31.5 168 31.938V240H112v-48h288v48H280v239.938C336 479.5 392 476 448 448L416.656 72H95.344zm64.875 88a8 8 0 0 1 7.78 8 8 8 0 0 1-16 0 8 8 0 0 1 8.22-8zm48 0a8 8 0 0 1 7.78 8 8 8 0 0 1-16 0 8 8 0 0 1 8.22-8zm48 0a8 8 0 0 1 7.78 8 8 8 0 0 1-16 0 8 8 0 0 1 8.22-8zm48 0a8 8 0 0 1 7.78 8 8 8 0 0 1-16 0 8 8 0 0 1 8.22-8zm48 0a8 8 0 0 1 7.78 8 8 8 0 0 1-16 0 8 8 0 0 1 8.22-8zM248 240v240c2.667.002 5.333 0 8 0s5.333.002 8 0V240h-16zm-120 48h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16zm112 0h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16zm-240 32h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16zm112 0h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16zm-240 32h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16zm112 0h16v16h-16v-16zm32 0h16v16h-16v-16zm32 0h16v16h-16v-16z" />
                            </svg>
                        )}
                        {knight.level === 'mighty' && (
                            <svg x={-12} y={-12} width={24} height={24} viewBox="0 0 512 512" className="pointer-events-none" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5)) ${knight.active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))' : ''}` }}>
                                <path d="M0 0h512v512H0z" fill={color || 'gray'} fillOpacity={knight.active ? 1 : 0.5} />
                                <path fill="#fff" fillOpacity={knight.active ? 1 : 0.5} d="M222.776 64.76a16.1 16.1 0 0 1 4.22.56c8.45 2.29 13.88 11.15 14.57 22l-25.78 6 21.89 13.86c-4.93 10.47-13.67 17.3-22.34 17.3a16.1 16.1 0 0 1-4.22-.56c-11.68-3.16-17.59-18.85-13.2-35 3.87-14.26 14.43-24.16 24.86-24.16zm-20.29-9.44a38.78 38.78 0 0 1 9.18-4.65c-5.47-4.23-12.06-8.82-15.9-9.73-27.8-6.55-28.34 34.41-49.08 15.35 16.77 30.56 35.36-12.18 55.8-.96zm54 115.56c-6.437-14.24-23.208-20.557-37.44-14.1l23.34 51.55c14.246-6.438 20.57-23.21 14.12-37.45zm-69.52 35-21.72-6.66-60.94 31 7.16 14.07zm29.88-65.41h-1.53c-2.836.002-5.66-.37-8.4-1.11a32.64 32.64 0 0 1-14.27-8.23l-19.49 53.78 47.69 14.63-10.68-23.59-14-2.64 9.69-7-8.01-17.51s17.52-7.83 19-8.33zm-132.65 143c-64.72-46.18 42-97.32-47.05-105.87 59.27 26.57-49.43 44.81-10.25 97.71 7.49 10.11 34.76 24.95 49.64 32.56a78.51 78.51 0 0 1 7.7-24.38zm132.79-63.26 2.31-4.42-10.29-3.15-49.91 25.39 68.65 26.47-48.34 40.09 40.63 26.55-6.5-23.93 45.41-49zm13.73-82c4.898.003 9.76.82 14.39 2.42l41.79-21.22a184.67 184.67 0 0 0-35.66-3.51c-5.68 11-14.35 19-24.17 22.51 1.21-.09 2.43-.16 3.65-.16zm182 124.37h-4.15c-5.37 0-11.36-.21-17.77-.63l12.66 18 25-7.33s-1.13-4.55-2.74-11.23a82.78 82.78 0 0 1-13.04 1.23zm-138.97-46.37c13.84-22.89 46.76-66.73 96-66.73 16.79 0 35.49 5.1 56 17.86l-11 19.83.21 21.93c-.43 3.25 3.4 21 7.08 36.9-6.65 1.15-23 1-43.18-1l-5.68-8.1c-16.16-9.55-28.75-15.76-28.75-15.76s.91 7.77 1.22 19.23c-23.06-4.18-46.85-10.67-64.84-20.13a81.992 81.992 0 0 1-7.06-4.03zm120.1-18.38c0 4.678 5.655 7.02 8.963 3.712 3.306-3.307.964-8.962-3.714-8.962a5.25 5.25 0 0 0-5.25 5.25zm-132.64-47.42a44.15 44.15 0 0 1 9.43 12.91l223.21-123.4v-9.4zm76.17 154.12c5.64-14.72 7.68-32.58 8.2-48a325.89 325.89 0 0 1-49-12.25 151.31 151.31 0 0 1-30.12-13.81l13.78 96.66-129 17.14-10.39-87.05c-4.26 1.77-8.45 3.64-12.54 5.64-58.81 28.68-29.46 96.18-29.46 96.18l-25 49.21 30.11 54.35v18.81h33.9l-15.74-22.83-14.48-52.57 48.87-46.4c27.89 1.26 102.44-11.49 134.52-17l83 4.55 22.88 29.29-16.85 12.55 29.55 13.9 9.37-18.45-19.23-49.28zm-51.22-131.12-11.31 5.72a44.08 44.08 0 0 1-.07 7.38c3.46-4.32 7.23-8.75 11.38-13.1zm31.69 231.92-5-45.44-20.89-1.14c-6.2 1.06-13.11 2.22-20.44 3.43l21.46 47.74 17.68 54.56-.63 17h31.67l-9.65-17.83zm-140.38 19.45 36.79-53.82c-21.33 2.95-51.31 5.07-51.47 5.07l2.93 7.61-19.1 41.87 47 44.07v11.75h28.65l-11.35-12.92z" />
                            </svg>
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
                )
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

            {/* Pending Placement Confirmation Icons */}
            {isPendingPlacement && (
                <>
                    {/* Green Check - Confirm */}
                    <g
                        transform="translate(20, -20)"
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirmPlacement?.();
                        }}
                    >
                        <circle r={10} fill="#22c55e" stroke="white" strokeWidth={2} />
                        <text x="0" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">✓</text>
                        <title>Confirm Placement</title>
                    </g>

                    {/* Red X - Cancel */}
                    <g
                        transform="translate(-20, -20)"
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancelPlacement?.();
                        }}
                    >
                        <circle r={10} fill="#ef4444" stroke="white" strokeWidth={2} />
                        <text x="0" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">✕</text>
                        <title>Cancel Placement</title>
                    </g>
                </>
            )}
        </g>
    );
};
