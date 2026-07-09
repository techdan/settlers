import React from 'react';
import { Vertex } from '@/lib/types';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { Knight } from '@/lib/types/player';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';
import { PIECE_ICON_ID, KNIGHT_ICON_ID, PIECE_GRADIENT_ID, PIECE_GRADIENT_FALLBACK_ID } from '@/components/board/board-icon-defs';

const PIECE_SHADOW_STYLE: React.CSSProperties = { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' };

interface VertexRendererProps {
    vertex: Vertex;
    knight?: Knight;
    size: number;
    color?: string; // Color of the owner
    onClick?: (vertexId: string) => void;
    isValid?: boolean;
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

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, knight, size, color, onClick, isValid, isMoving, onCancelMove, currentPlayerId, showCancelIcon, cancelIconTitle, onCancelIconClick, isSelectedForAction, highlightVariant = 'default', isPendingPlacement, onConfirmPlacement, onCancelPlacement }) => {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, size);
    const playerColorFill = color ? PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color : undefined;
    // Settlement/city/metropolis background gradient: one stable gradient per canonical
    // player color (see PIECE_GRADIENT_ID), falling back to gray for unowned/unknown colors.
    const pieceFillUrl = `url(#${(playerColorFill && PIECE_GRADIENT_ID[playerColorFill]) || PIECE_GRADIENT_FALLBACK_ID})`;

    if (!vertex.structure && !knight && !isValid) return null;

    // Determine knight color/style based on level
    const getKnightStyle = () => {
        if (!knight) return null;
        const ringColor = knight.active ? 'var(--color-knight-mighty)' : 'var(--color-highlight-ink)';
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
        <g transform={`translate(${pixel.x}, ${pixel.y})`} onClick={() => onClick?.(vertex.id)} className={showPointer ? "cursor-pointer" : ""}>
            {/* Valid Target Indicator (for existing structures like cities) - Rendered FIRST to be behind structure */}
            {vertex.structure && isValid && (
                <circle r={size * 0.4} fill="none" strokeWidth={4} className="animate-pulse pointer-events-none"
                    stroke={highlightVariant === 'treason' ? 'var(--color-highlight-neutral)' : 'var(--color-highlight-danger)'} />
            )}

            {isSelectedForAction && (
                <circle r={size * 0.32} fill="none" strokeWidth={3} className="animate-pulse pointer-events-none"
                    stroke={highlightVariant === 'treason' ? 'var(--color-highlight-neutral)' : 'var(--color-highlight-info)'} />
            )}

            {/* Hitbox - Reduced size for tighter click area */}
            <circle r={size * 0.2} fill="transparent" />

            {/* Visual - Building (piece art lives in board-icon-defs.tsx; fill is the owner's gradient) */}
            {vertex.structure === 'settlement' && (
                <use href={`#${PIECE_ICON_ID.settlement}`} x={-12} y={-12} width={24} height={24} fill={pieceFillUrl} className="pointer-events-none" style={PIECE_SHADOW_STYLE} />
            )}
            {vertex.structure === 'city' && (
                <>
                    {vertex.hasCityWall && (
                        <rect x={-18} y={-18} width={36} height={36} rx={4} fill="none" strokeWidth={4}
                            stroke="var(--color-structure-wall-highlight)" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }} />
                    )}
                    <use href={`#${PIECE_ICON_ID.city}`} x={-14} y={-14} width={28} height={28} fill={pieceFillUrl} className="pointer-events-none" style={PIECE_SHADOW_STYLE} />
                </>
            )}
            {vertex.structure === 'metropolis' && (
                <>
                    {vertex.hasCityWall && (
                        <rect x={-22} y={-22} width={44} height={44} rx={6} fill="none" strokeWidth={4}
                            stroke="var(--color-structure-wall-highlight)" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }} />
                    )}
                    <use href={`#${PIECE_ICON_ID.metropolis}`} x={-16} y={-16} width={32} height={32} fill={pieceFillUrl} className="pointer-events-none" style={PIECE_SHADOW_STYLE} />
                </>
            )}

            {/* Visual - Knight (level-specific glyph lives in board-icon-defs.tsx; one <use> covers all 3 levels) */}
            {knight && knightStyle && (
                <g>
                    {/* Tooltip - transparent rect that can receive hover events */}
                    <rect x={-12} y={-12} width={24} height={24} fill="transparent" pointerEvents="all">
                        <title>{knight.level === 'basic' ? 'Basic' : knight.level === 'strong' ? 'Strong' : 'Mighty'} Knight (Strength {knightStyle.levelIndicator}) - {knight.active ? 'Active' : 'Inactive'}</title>
                    </rect>

                    {/* fill-opacity dims background + glyph together for inactive knights (see board-icon-defs.tsx) */}
                    <use
                        href={`#${KNIGHT_ICON_ID[knight.level]}`}
                        x={-12}
                        y={-12}
                        width={24}
                        height={24}
                        fill={playerColorFill || 'gray'}
                        fillOpacity={knight.active ? 1 : 0.5}
                        className="pointer-events-none"
                        style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5)) ${knight.active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))' : ''}` }}
                    />

                    {/* Cancel Move Button */}
                    {isMoving && (
                        <g transform="translate(15, -15)" className="cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            onCancelMove?.();
                        }}>
                            <circle r={8} fill="var(--color-highlight-danger)" stroke="var(--color-highlight-white)" strokeWidth={1} />
                            <text x="0" y="3" textAnchor="middle" fill="var(--color-highlight-white)" fontSize="10" fontWeight="bold">✕</text>
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
                    <circle r={8} fill="var(--color-highlight-danger)" stroke="var(--color-highlight-white)" strokeWidth={1} />
                    <text x="0" y="3" textAnchor="middle" fill="var(--color-highlight-white)" fontSize="10" fontWeight="bold">x</text>
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
                        <circle r={10} fill="var(--color-highlight-success)" stroke="var(--color-highlight-white)" strokeWidth={2} />
                        <text x="0" y="4" textAnchor="middle" fill="var(--color-highlight-white)" fontSize="14" fontWeight="bold">✓</text>
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
                        <circle r={10} fill="var(--color-highlight-danger)" stroke="var(--color-highlight-white)" strokeWidth={2} />
                        <text x="0" y="4" textAnchor="middle" fill="var(--color-highlight-white)" fontSize="14" fontWeight="bold">✕</text>
                        <title>Cancel Placement</title>
                    </g>
                </>
            )}
        </g>
    );
};
