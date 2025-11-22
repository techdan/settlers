import React from 'react';

interface NumberTokenProps {
    number: number;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ number }) => {
    const isRed = number === 6 || number === 8;
    const dots = getDots(number);

    return (
        <g>
            <circle r="25" fill="#F5F5DC" stroke="#333" strokeWidth="1" />
            <text y="5" textAnchor="middle" fill={isRed ? '#D00' : '#000'} fontSize="20" fontWeight="bold">
                {number}
            </text>
            <g transform="translate(0, 18)">
                {/* Render dots */}
                {Array.from({ length: dots }).map((_, i) => (
                    <circle key={i} cx={(i - (dots - 1) / 2) * 6} r="2" fill={isRed ? '#D00' : '#000'} />
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
