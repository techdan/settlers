import React from 'react';

export const Robber: React.FC = () => {
    return (
        <g transform="translate(0, -10)">
            <circle r="15" fill="#333" stroke="#000" />
            <circle cy="-10" r="8" fill="#333" stroke="#000" />
        </g>
    );
};
