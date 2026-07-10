import React from 'react';
import { TT, TT_SERIF, r2 } from './palette';

interface NumberTokenProps {
    number: number;
    highlight?: 'primary' | 'secondary';
    radius?: number;
}

/**
 * Tabletop number token — cream punched-cardboard disc with a double brass ring,
 * serif numeral (red for 6/8), and probability pips (§2.1 token colors).
 */
export const NumberToken: React.FC<NumberTokenProps> = ({ number, highlight, radius = 14 }) => {
    const isRed = number === 6 || number === 8;
    const ink = isRed ? TT.token.red : TT.token.ink;
    const dots = getDots(number);

    const fontSize = Math.max(10, Math.round(radius * 0.86));
    const textYOffset = r2(radius * 0.28);
    const dotsYOffset = r2(radius * 0.6);
    const dotSpacing = r2(radius * 0.24);
    const dotRadius = Math.max(0.9, r2(radius * 0.075));
    const highlightColor =
        highlight === 'secondary' ? TT.highlight.secondary : TT.highlight.primary;

    return (
        <g>
            {highlight && (
                <circle
                    r={r2(radius * 1.3)}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth={3}
                    opacity={0.9}
                    className="animate-pulse"
                />
            )}
            {/* drop shadow: token sits on the tile */}
            <circle cy={1.5} r={radius} fill="#000000" opacity={0.25} />
            {/* face + double ring */}
            <circle r={radius} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1.4} />
            <circle r={r2(radius * 0.82)} fill="none" stroke={TT.token.ringInner} strokeWidth={0.8} />
            <text
                y={textYOffset}
                textAnchor="middle"
                fill={ink}
                fontSize={fontSize}
                fontWeight={700}
                fontFamily={TT_SERIF}
            >
                {number}
            </text>
            <g transform={`translate(0, ${dotsYOffset})`}>
                {Array.from({ length: dots }).map((_, i) => (
                    <circle
                        key={i}
                        cx={r2((i - (dots - 1) / 2) * dotSpacing)}
                        r={dotRadius}
                        fill={ink}
                    />
                ))}
            </g>
        </g>
    );
};

function getDots(num: number): number {
    if (num === 2 || num === 12) return 1;
    if (num === 3 || num === 11) return 2;
    if (num === 4 || num === 10) return 3;
    if (num === 5 || num === 9) return 4;
    if (num === 6 || num === 8) return 5;
    return 0;
}
