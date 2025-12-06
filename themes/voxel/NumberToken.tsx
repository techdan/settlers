import React from 'react';

interface NumberTokenProps {
    number: number;
    highlight?: 'primary' | 'secondary';
    radius?: number;
}

export const VoxelNumberToken: React.FC<NumberTokenProps> = ({ number, highlight, radius = 20 }) => {
    const isRed = number === 6 || number === 8;
    const dots = getDots(number);
    const highlightColor = highlight === 'secondary' ? '#22d3ee' : '#22c55e';
    const rx = radius;
    const ry = radius * 0.6;
    const highlightRx = radius * 1.4;
    const highlightRy = radius * 0.9;
    const fontSize = Math.max(10, Math.round(radius * 0.75));
    const textYOffset = Math.round(radius * 0.25);
    const dotsYOffset = Math.round(radius * 0.7);
    const dotSpacing = radius * 0.25;
    const dotRadius = Math.max(1, radius * 0.075);

    return (
        <g transform="translate(0, -5)">
            {highlight && (
                <ellipse
                    cx="0"
                    cy="-2"
                    rx={highlightRx}
                    ry={highlightRy}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth="3"
                    opacity="0.85"
                />
            )}
            {/* 3D Edge (Cylinder side) */}
            <ellipse cx="0" cy="4" rx={rx} ry={ry} fill="#d1d1a5" stroke="#333" strokeWidth="1" />

            {/* Top Face */}
            <ellipse cx="0" cy="0" rx={rx} ry={ry} fill="#F5F5DC" stroke="#333" strokeWidth="1" />

            <text y={textYOffset} textAnchor="middle" fill={isRed ? '#D00' : '#000'} fontSize={fontSize} fontWeight="bold">
                {number}
            </text>

            <g transform={`translate(0, ${dotsYOffset})`}>
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
