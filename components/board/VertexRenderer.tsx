import React from 'react';
import { Vertex } from '@/lib/types';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { Knight } from '@/lib/types/player';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';
import type { BuildMode } from '@/lib/types/board-selection-state';
import { Settlement, City, Metropolis, CityWall, KnightPiece } from '@/themes/tabletop';
import { StatusGlyph } from '@/themes/tabletop/glyphs';

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
    validTargetType?: BuildMode;
}

export const VertexRenderer: React.FC<VertexRendererProps> = ({ vertex, knight, size, color, onClick, isValid, isMoving, onCancelMove, currentPlayerId, showCancelIcon, cancelIconTitle, onCancelIconClick, isSelectedForAction, highlightVariant = 'default', isPendingPlacement, onConfirmPlacement, onCancelPlacement, validTargetType }) => {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, size);
    const playerColorFill = color ? PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color : undefined;
    const pieceColor = playerColorFill || 'gray';

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

            {/* Visual - Building (tabletop piece art; player-color parametric) */}
            {vertex.structure === 'settlement' && <Settlement color={pieceColor} />}
            {vertex.structure === 'city' && (
                <>
                    {vertex.hasCityWall && <CityWall color={pieceColor} />}
                    <City color={pieceColor} />
                </>
            )}
            {vertex.structure === 'metropolis' && (
                <>
                    {vertex.hasCityWall && <CityWall color={pieceColor} width={33} />}
                    <Metropolis color={pieceColor} />
                </>
            )}

            {/* Visual - Knight (tabletop shield piece; level via helm silhouette + pips) */}
            {knight && knightStyle && (
                <g>
                    {/* Tooltip - transparent rect that can receive hover events */}
                    <rect x={-12} y={-12} width={24} height={24} fill="transparent" pointerEvents="all">
                        <title>{knight.level === 'basic' ? 'Basic' : knight.level === 'strong' ? 'Strong' : 'Mighty'} Knight (Strength {knightStyle.levelIndicator}) - {knight.active ? 'Active' : 'Inactive'}</title>
                    </rect>

                    <KnightPiece color={pieceColor} level={knight.level} active={knight.active} />

                    {/* Cancel Move Button */}
                    {isMoving && (
                        <g transform="translate(15, -15)" className="cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            onCancelMove?.();
                        }}>
                            <circle r={8} fill="var(--color-highlight-danger)" stroke="var(--color-highlight-white)" strokeWidth={1} />
                            <g transform="scale(0.65)"><StatusGlyph type="cancel" /></g>
                            <title>Cancel Move</title>
                        </g>
                    )}
                </g>
            )}

            {!vertex.structure && isValid && validTargetType === 'knight' ? (
                <g
                    data-placement-target="knight"
                    role="button"
                    tabIndex={0}
                    aria-label="Legal knight placement"
                    className="cursor-pointer transition-opacity hover:opacity-100 focus:outline-none"
                    onClick={(event) => {
                        event.stopPropagation();
                        onClick?.(vertex.id);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onClick?.(vertex.id);
                        }
                    }}
                >
                    <circle
                        r={18}
                        fill="var(--ui-panel-solid)"
                        fillOpacity={0.9}
                        stroke="var(--ui-accent)"
                        strokeWidth={3}
                        className="animate-pulse pointer-events-none"
                    />
                    <g opacity={0.82} className="pointer-events-none">
                        <KnightPiece color={pieceColor} level="basic" active={false} />
                    </g>
                    <title>Place a knight here</title>
                </g>
            ) : !vertex.structure && isValid ? (
                <circle r={8} fill="rgba(255, 255, 255, 0.5)" className="hover:fill-white transition-colors" />
            ) : null}

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
                    <g transform="scale(0.65)"><StatusGlyph type="cancel" /></g>
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
                        <g transform="scale(0.78)"><StatusGlyph type="confirm" /></g>
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
                        <g transform="scale(0.78)"><StatusGlyph type="cancel" /></g>
                        <title>Cancel Placement</title>
                    </g>
                </>
            )}
        </g>
    );
};
