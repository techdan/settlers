import React from 'react';
import { TT, shade } from './palette';
import { PLAYER_COLOR_VAR_MAP } from '@/lib/constants/player-colors';
import type { PlayerColor } from '@/lib/types/player';

interface MerchantProps {
    /** Owning player's color (name or css value); tints the sash */
    color?: string;
}

/**
 * Tabletop merchant (C&K) — cream pawn with a wide brass hat and a sash in
 * the owning player's color. Same lighting rules as the robber (§2.2).
 */
export const Merchant: React.FC<MerchantProps> = ({ color }) => {
    const sash = color
        ? PLAYER_COLOR_VAR_MAP[(color.toLowerCase?.() as PlayerColor) || (color as PlayerColor)] || color
        : TT.merchant.hat;
    const body = TT.merchant.body;

    return (
        <g>
            <title>Merchant</title>
            {/* ground shadow */}
            <ellipse cy={13} rx={11} ry={3.2} fill="#000000" opacity={0.25} />
            {/* body — right (shadow) then left (lit) */}
            <path
                d="M 0 12 C 6.5 12 8 5.5 6.5 0.5 C 5.4 -3 3.2 -5.5 0 -7 L 0 12 Z"
                fill={TT.merchant.bodyShade}
            />
            <path
                d="M 0 12 C -6.5 12 -8 5.5 -6.5 0.5 C -5.4 -3 -3.2 -5.5 0 -7 L 0 12 Z"
                fill={body}
            />
            {/* sash in player color */}
            <path
                d="M -5.2 -1.5 C -1.5 1 1.5 1 5.2 -1.5 L 5.2 1.5 C 1.5 4 -1.5 4 -5.2 1.5 Z"
                fill={sash}
                stroke={shade(TT.merchant.bodyShade, 0.8)}
                strokeWidth={0.5}
            />
            {/* head */}
            <circle cy={-9.5} r={4} fill={body} />
            {/* wide-brim hat, brass */}
            <ellipse cy={-12} rx={7.5} ry={2.4} fill={TT.merchant.hat} />
            <path d="M -3.5 -12.5 A 3.5 3.5 0 0 1 3.5 -12.5 L 3.5 -14.5 A 3.5 2.4 0 0 0 -3.5 -14.5 Z" fill={shade(TT.merchant.hat, 1.25)} />
            {/* outline */}
            <path
                d="M 6.5 0.5 C 8 5.5 6.5 12 0 12 C -6.5 12 -8 5.5 -6.5 0.5"
                fill="none"
                stroke={shade(TT.merchant.bodyShade, 0.7)}
                strokeWidth={1}
                opacity={0.8}
            />
        </g>
    );
};
