import React from 'react';
import { Edge } from '@/lib/types';
import { createHex, hexEdgeToPixel } from '@/lib/hex';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';
import { Road } from '@/themes/tabletop';
import { StatusGlyph } from '@/themes/tabletop/glyphs';

interface EdgeRendererProps {
    edge: Edge;
    size: number;
    color?: string;
    onClick?: (edgeId: string) => void;
    isValid?: boolean;
    isSelected?: boolean;
    isPendingPlacement?: boolean;
    onConfirmPlacement?: () => void;
    onCancelPlacement?: () => void;
}

export const EdgeRenderer: React.FC<EdgeRendererProps> = ({ edge, size, color, onClick, isValid, isSelected, isPendingPlacement, onConfirmPlacement, onCancelPlacement }) => {
    const pixel = hexEdgeToPixel(createHex(edge.q, edge.r), edge.d, size);
    // Edge 0 is vertical (connecting 330 and 30 deg).
    const rotation = 60 * edge.d;
    const ownerColor = color ? PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color : undefined;

    if (!edge.structure && !isValid) return null;

    return (
        <g transform={`translate(${pixel.x}, ${pixel.y}) rotate(${rotation})`} onClick={() => onClick?.(edge.id)} className={isValid ? "cursor-pointer" : ""}>
            {/* Hitbox */}
            <rect x={-10} y={-size * 0.35} width={20} height={size * 0.7} fill="transparent" />

            {/* Visual */}
            {edge.structure === 'road' && (
                <Road color={ownerColor || 'gray'} length={size * 0.6} />
            )}
            {edge.structure === 'road' && isSelected && (
                <rect
                    x={-6}
                    y={-size * 0.32}
                    width={12}
                    height={size * 0.64}
                    fill="none"
                    stroke="#00cc00"
                    strokeWidth={4}
                />
            )}
            {edge.structure === 'road' && isValid && !isSelected && (
                <rect
                    x={-6}
                    y={-size * 0.32}
                    width={12}
                    height={size * 0.64}
                    fill="none"
                    stroke="var(--color-highlight-white)"
                    strokeWidth={4}
                    className="animate-pulse"
                />
            )}
            {!edge.structure && isValid && (
                <rect x={-4} y={-size * 0.25} width={8} height={size * 0.5} fill="rgba(255, 255, 255, 0.6)" stroke="var(--color-highlight-white)" strokeWidth={1} className="hover:fill-white transition-colors" />
            )}

            {/* Pending Placement Confirmation Icons */}
            {isPendingPlacement && (
                <g transform={`rotate(${-rotation})`}>
                    {/* Green Check - Confirm */}
                    <g
                        transform="translate(20, 0)"
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
                        transform="translate(-20, 0)"
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
                </g>
            )}
        </g>
    );
};
