import React from 'react';
import { TT, shade } from './palette';

/**
 * Tabletop robber — the grey pawn from the physical game, lit from the
 * top-left (§2.2): left face lighter, right face darker, grounded by an
 * ellipse shadow. Fixed size, tuned for hex size 90 (~30px tall).
 */
export const Robber: React.FC = () => {
    const body = TT.robber.body;
    return (
        <g>
            <title>Robber</title>
            {/* ground shadow */}
            <ellipse cy={13} rx={11} ry={3.2} fill="#000000" opacity={0.28} />
            {/* base disc */}
            <ellipse cy={11} rx={9.5} ry={3.4} fill={TT.robber.base} />
            <path
                d="M -9.5 11 A 9.5 3.4 0 0 1 9.5 11 L 9.5 8.5 A 9.5 3.4 0 0 0 -9.5 8.5 Z"
                fill={shade(TT.robber.base, 1.25)}
            />
            {/* cloak body — right (shadow) half then left (lit) half */}
            <path
                d="M 0 9 C 7 9 8.5 3.5 7 -1.5 C 5.8 -5.5 3.4 -8 0 -9.5 L 0 9 Z"
                fill={shade(body, 0.78)}
            />
            <path
                d="M 0 9 C -7 9 -8.5 3.5 -7 -1.5 C -5.8 -5.5 -3.4 -8 0 -9.5 L 0 9 Z"
                fill={TT.robber.bodyLight}
            />
            {/* head */}
            <circle cy={-12.5} r={4.6} fill={shade(body, 0.9)} />
            <path d="M -4.6 -12.5 A 4.6 4.6 0 0 1 4.6 -12.5 L 0 -12.5 Z" fill={TT.robber.bodyLight} opacity={0.5} />
            {/* outline keeps the pawn legible on dark terrains */}
            <path
                d="M 0 -17.1 C 3.4 -16.6 4.6 -14 4.4 -11.6 C 6.2 -8.6 8.2 -4 7.6 0.5 C 7.2 4.5 4.5 8 0 9"
                fill="none"
                stroke={shade(body, 0.55)}
                strokeWidth={1}
                opacity={0.7}
            />
        </g>
    );
};
