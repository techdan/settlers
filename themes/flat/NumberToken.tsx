import React from 'react';

interface NumberTokenProps {
    number: number;
    highlight?: 'primary' | 'secondary';
    radius?: number;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ number, highlight, radius = 25 }) => {
    const isRed = number === 6 || number === 8;
    const dots = getDots(number);
    const highlightColor = highlight === 'secondary' ? '#22d3ee' : '#22c55e';
    const highlightRadius = radius * 1.32;
    const fontSize = Math.max(10, Math.round(radius * 0.8));
    const textYOffset = Math.round(radius * 0.2);
    const dotsYOffset = Math.round(radius * 0.72);
    const dotSpacing = radius * 0.24;
    const dotRadius = Math.max(1, radius * 0.08);

    return (
        <g>
            {highlight && (
                <circle
                    r={highlightRadius}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth="3"
                    opacity="0.9"
                />
            )}
            <circle r={radius} fill="#F5F5DC" stroke="#333" strokeWidth="1" />
            <text y={textYOffset} textAnchor="middle" fill={isRed ? '#D00' : '#000'} fontSize={fontSize} fontWeight="bold">
                {number}
            </text>
            <g transform={`translate(0, ${dotsYOffset})`}>
                {/* Render dots */}
                {Array.from({ length: dots }).map((_, i) => (
                    <circle key={i} cx={(i - (dots - 1) / 2) * dotSpacing} r={dotRadius} fill={isRed ? '#D00' : '#000'} />
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
