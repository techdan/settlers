import React from 'react';
import { Knight } from '@/lib/types/player';
import { createHex, hexCornerToPixel } from '@/lib/hex';
import { FlatKnight } from '@/themes/flat/Knight';
import { VoxelKnight } from '@/themes/voxel/Knight';

interface KnightRendererProps {
    knight: Knight;
    size: number;
    color: string;
    theme?: 'flat' | 'voxel';
    onClick?: (knightId: string) => void;
}

export const KnightRenderer: React.FC<KnightRendererProps> = ({
    knight,
    size,
    color,
    theme = 'flat',
    onClick
}) => {
    // Parse vertexId to get q, r, d
    // vertexId format: "q,r,d"
    const [q, r, d] = knight.vertexId.split(',').map(Number);

    const pixel = hexCornerToPixel(createHex(q, r), d, size);
    const DEPTH = 15;
    const offset = theme === 'voxel' ? { x: 0, y: -DEPTH } : { x: 0, y: 0 };

    return (
        <g
            transform={`translate(${pixel.x + offset.x}, ${pixel.y + offset.y})`}
            onClick={() => onClick?.(knight.id)}
            className={onClick ? "cursor-pointer" : ""}
        >
            {theme === 'voxel' ? (
                <VoxelKnight knight={knight} color={color} />
            ) : (
                <FlatKnight knight={knight} color={color} />
            )}
        </g>
    );
};
