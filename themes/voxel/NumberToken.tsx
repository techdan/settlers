import React from 'react';

interface NumberTokenProps {
    number: number;
    highlight?: 'primary' | 'secondary';
}

export const VoxelNumberToken: React.FC<NumberTokenProps> = ({ number, highlight }) => {
    const isRed = number === 6 || number === 8;
    const dots = getDots(number);
    const highlightColor = highlight === 'secondary' ? '#22d3ee' : '#22c55e';

    return (
        <g transform="translate(0, -5)">
            {highlight && (
                <ellipse
                    cx="0"
                    cy="-2"
                    rx="28"
                    ry="18"
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth="3"
                    opacity="0.85"
                />
            )}
            {/* 3D Edge (Cylinder side) */}
            <ellipse cx="0" cy="4" rx="20" ry="12" fill="#d1d1a5" stroke="#333" strokeWidth="1" />

            {/* Top Face */}
            <ellipse cx="0" cy="0" rx="20" ry="12" fill="#F5F5DC" stroke="#333" strokeWidth="1" />

            <text y="5" textAnchor="middle" fill={isRed ? '#D00' : '#000'} fontSize="16" fontWeight="bold">
                {number}
            </text>

            <g transform="translate(0, 14)">
                {Array.from({ length: dots }).map((_, i) => (
                    <circle key={i} cx={(i - (dots - 1) / 2) * 5} r="1.5" fill={isRed ? '#D00' : '#000'} />
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
