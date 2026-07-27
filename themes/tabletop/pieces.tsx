import React from 'react';
import { TT } from './palette';

/**
 * Tabletop player pieces — settlements, cities, metropolises, walls, roads,
 * knights. All are player-color parametric.
 *
 * Color handling: `color` arrives as a CSS custom property reference
 * (var(--color-player-N)), so facet shading uses CSS brightness() filters —
 * which work on any paint value instead of relying on hex-color math. Sun is
 * top-left (§2.2): tops lightest, left lit, right dark.
 * Every grounded piece carries its own ellipse shadow.
 */

const CREAM = TT.token.face;

const darker = (f: number): React.CSSProperties => ({ filter: `brightness(${f})` });

/* ---------------- road (drawn vertical; EdgeRenderer rotates the group) ---------------- */

export const Road: React.FC<{ color: string; length: number }> = ({ color, length }) => {
    const half = length / 2;
    return (
        <g data-piece="road" className="pointer-events-none">
            {/* body first: smoke tests match rect[fill=<player var>] */}
            <rect x={-4.5} y={-half} width={9} height={length} rx={3.5} fill={color} />
            <rect x={-4.5} y={-half} width={9} height={length} rx={3.5} fill="none" stroke={color} strokeWidth={1.5} style={darker(0.55)} />
            <rect x={-3.1} y={-half + 2} width={2.4} height={length - 4} rx={1.2} fill="#ffffff" opacity={0.25} />
        </g>
    );
};

/* ---------------- buildings ---------------- */

export const Settlement: React.FC<{ color: string }> = ({ color }) => (
    <g data-piece="settlement" className="pointer-events-none">
        <ellipse cy={9} rx={9.5} ry={2.6} fill="#000000" opacity={0.3} />
        <path d="M -8 8 L -8 -1 L 0 -8.5 L 8 -1 L 8 8 Z" fill={color} />
        <path d="M -8 -1 L 0 -8.5 L 8 -1 Z" fill={color} style={darker(1.28)} />
        <path d="M -8 8 L -8 -1 L 0 -8.5" fill="none" stroke="#ffffff" strokeWidth={1.1} opacity={0.3} strokeLinecap="round" />
        <rect x={-1.8} y={2.8} width={3.6} height={5.2} rx={0.8} fill={color} style={darker(0.5)} />
        <path d="M -8 8 L -8 -1 L 0 -8.5 L 8 -1 L 8 8 Z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" style={darker(0.55)} />
    </g>
);

export const City: React.FC<{ color: string }> = ({ color }) => (
    <g data-piece="city" className="pointer-events-none">
        <ellipse cy={10} rx={12.5} ry={2.8} fill="#000000" opacity={0.3} />
        {/* main hall */}
        <path d="M -10 9 L -10 0 L -3 -6 L 4 0 L 4 9 Z" fill={color} />
        <path d="M -10 0 L -3 -6 L 4 0 Z" fill={color} style={darker(1.28)} />
        <rect x={-6.6} y={1.8} width={2.4} height={3} fill={CREAM} opacity={0.9} />
        <rect x={-1.8} y={1.8} width={2.4} height={3} fill={CREAM} opacity={0.9} />
        <path d="M -10 9 L -10 0 L -3 -6 L 4 0 L 4 9 Z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" style={darker(0.55)} />
        {/* watchtower */}
        <rect x={4.5} y={-11} width={6.5} height={20} fill={color} style={darker(0.86)} />
        <polygon points="3.6,-11 12,-11 7.75,-16.8" fill={color} style={darker(1.3)} />
        <rect x={6.4} y={-7} width={2.6} height={3} fill={CREAM} opacity={0.9} />
        <path d="M 4.5 9 L 4.5 -11 L 3.6 -11 L 7.75 -16.8 L 12 -11 L 11 -11 L 11 9" fill="none" stroke={color} strokeWidth={1.3} strokeLinejoin="round" style={darker(0.55)} />
    </g>
);

export const Metropolis: React.FC<{ color: string }> = ({ color }) => (
    <g data-piece="metropolis" className="pointer-events-none" transform="scale(1.12)">
        <ellipse cy={10} rx={13} ry={2.8} fill="#000000" opacity={0.3} />
        <path d="M -10 9 L -10 0 L -3 -6 L 4 0 L 4 9 Z" fill={color} />
        <path d="M -10 0 L -3 -6 L 4 0 Z" fill={color} style={darker(1.28)} />
        <rect x={-6.6} y={1.8} width={2.4} height={3} fill={CREAM} opacity={0.9} />
        <rect x={-1.8} y={1.8} width={2.4} height={3} fill={CREAM} opacity={0.9} />
        <path d="M -10 9 L -10 0 L -3 -6 L 4 0 L 4 9 Z" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" style={darker(0.55)} />
        <rect x={4.5} y={-13} width={6.5} height={22} fill={color} style={darker(0.86)} />
        <rect x={6.4} y={-8} width={2.6} height={3} fill={CREAM} opacity={0.9} />
        <path d="M 4.5 9 L 4.5 -13 L 11 -13 L 11 9" fill="none" stroke={color} strokeWidth={1.3} style={darker(0.55)} />
        {/* the gilded tier that marks a metropolis */}
        <rect x={5} y={-17.5} width={5.5} height={4.5} fill={TT.highlight.primary} />
        <polygon points="4.2,-17.5 11.3,-17.5 7.75,-23" fill={TT.highlight.primary} style={darker(1.15)} />
        <circle cx={7.75} cy={-23.6} r={1.1} fill={TT.highlight.primary} style={darker(1.3)} />
        <path d="M 5 -13 L 5 -17.5 L 4.2 -17.5 L 7.75 -23 L 11.3 -17.5 L 10.5 -17.5 L 10.5 -13" fill="none" stroke={TT.highlight.primary} strokeWidth={0.9} style={darker(0.7)} />
    </g>
);

/** Rampart ring drawn beneath a walled city/metropolis */
export const CityWall: React.FC<{ color: string; width?: number }> = ({ color, width = 29 }) => {
    const half = width / 2;
    return (
        <g data-piece="city-wall" className="pointer-events-none">
            <ellipse cy={9.5} rx={half + 1.5} ry={2.6} fill="#000000" opacity={0.22} />
            <rect x={-half} y={2.5} width={width} height={7} rx={1.6} fill={color} style={darker(0.62)} />
            {[-half + 1.5, -half / 2 - 1, 1, half / 2 + 2].map(x => (
                <rect key={x} x={x} y={-0.4} width={3.4} height={4} rx={0.6} fill={color} style={darker(0.62)} />
            ))}
            <rect x={-half} y={2.5} width={width} height={1.6} rx={0.8} fill="#ffffff" opacity={0.18} />
            <rect x={-half} y={2.5} width={width} height={7} rx={1.6} fill="none" stroke={color} strokeWidth={1} style={darker(0.42)} />
        </g>
    );
};

/* ---------------- knights ---------------- */

type KnightLevel = 'basic' | 'strong' | 'mighty';

const HELMS: Record<KnightLevel, React.ReactNode> = {
    // pot helm
    basic: (
        <g>
            <path d="M -3.6 -1.2 A 3.6 3.6 0 0 1 3.6 -1.2 L 3.6 1.6 L -3.6 1.6 Z" fill={CREAM} />
        </g>
    ),
    // great helm with nasal bar
    strong: (
        <g>
            <path d="M -4.2 -0.8 A 4.2 4.2 0 0 1 4.2 -0.8 L 4.2 2.2 L -4.2 2.2 Z" fill={CREAM} />
            <rect x={-0.6} y={-6} width={1.2} height={4.4} rx={0.5} fill={CREAM} />
        </g>
    ),
    // crowned helm
    mighty: (
        <g>
            <path d="M -4.2 -0.8 A 4.2 4.2 0 0 1 4.2 -0.8 L 4.2 2.2 L -4.2 2.2 Z" fill={CREAM} />
            <polygon
                points="-4.4,-4 -2.9,-6.8 -1.5,-4.4 0,-7.2 1.5,-4.4 2.9,-6.8 4.4,-4 4.4,-2.6 -4.4,-2.6"
                fill={TT.highlight.primary}
            />
        </g>
    ),
};

const LEVEL_PIPS: Record<KnightLevel, number> = { basic: 1, strong: 2, mighty: 3 };

export const KnightPiece: React.FC<{ color: string; level: KnightLevel; active: boolean }> = ({
    color,
    level,
    active,
}) => {
    // Inactive knights are desaturated with the banner ring dropped — reads as
    // "stood down", not as a rendering glitch (old approach was 50% opacity).
    const groupStyle: React.CSSProperties = active
        ? { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }
        : { filter: 'grayscale(0.75) brightness(0.9) drop-shadow(0 2px 3px rgba(0,0,0,0.3))', opacity: 0.85 };

    // visor slit fill matches the shield so it reads as a cutout
    const slitStyle = darker(0.7);

    return (
        <g data-piece={`knight-${level}`} data-active={active} className="pointer-events-none" style={groupStyle}>
            <ellipse cy={11.4} rx={8} ry={2.2} fill="#000000" opacity={0.3} />
            {active && (
                <circle r={12.5} fill="none" stroke={TT.highlight.primary} strokeWidth={1.8} opacity={0.9} />
            )}
            <path
                d="M 0 -10 L 8.5 -6.8 L 8.5 0.6 Q 8.5 7 0 11 Q -8.5 7 -8.5 0.6 L -8.5 -6.8 Z"
                fill={color}
            />
            <path d="M 0 -10 L -8.5 -6.8 L -8.5 0.6 Q -8.5 7 0 11 Z" fill="#ffffff" opacity={0.12} />
            <path
                d="M 0 -10 L 8.5 -6.8 L 8.5 0.6 Q 8.5 7 0 11 Q -8.5 7 -8.5 0.6 L -8.5 -6.8 Z"
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                style={darker(0.5)}
            />
            <g transform="translate(0, -1.6)">
                {HELMS[level]}
                <rect x={-2.6} y={-0.4} width={5.2} height={1.05} rx={0.5} fill={color} style={slitStyle} />
            </g>
            {Array.from({ length: LEVEL_PIPS[level] }).map((_, i) => (
                <circle
                    key={i}
                    cx={(i - (LEVEL_PIPS[level] - 1) / 2) * 3.4}
                    cy={6.6}
                    r={1.15}
                    fill={CREAM}
                />
            ))}
        </g>
    );
};
