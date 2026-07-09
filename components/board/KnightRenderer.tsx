import React from 'react';
import { Knight } from '@/lib/types/player';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { FlatKnight } from '@/themes/flat/Knight';

interface KnightRendererProps {
    knight: Knight;
    size: number;
    color: string;
    onClick?: (knightId: string) => void;
}

export const KnightRenderer: React.FC<KnightRendererProps> = ({
    knight,
    size,
    color,
    onClick
}) => {
    // Parse vertexId to get q, r, d
    // vertexId format: "q,r,d"
    const [q, r, d] = knight.vertexId.split(',').map(Number);

    const pixel = hexCornerToPixel(createHex(q, r), d, size);

    return (
        <g
            transform={`translate(${pixel.x}, ${pixel.y})`}
            onClick={() => onClick?.(knight.id)}
            className={onClick ? "cursor-pointer" : ""}
        >
            <FlatKnight knight={knight} color={color} />
        </g>
    );
};
