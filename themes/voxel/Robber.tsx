import React from 'react';

export const VoxelRobber: React.FC = () => {
    return (
        <g transform="translate(0, -20)">
            {/* Body */}
            <path d="M-10,0 L0,5 L10,0 L10,-15 L0,-20 L-10,-15 Z" fill="#4a4a4a" stroke="#000" strokeWidth="1" />
            <path d="M-10,0 L0,5 L0,-15 L-10,-20 Z" fill="#333" /> {/* Side shading */}
            <path d="M0,5 L10,0 L10,-15 L0,-20 Z" fill="#1a1a1a" /> {/* Side shading */}

            {/* Head */}
            <g transform="translate(0, -25)">
                <path d="M-8,0 L0,4 L8,0 L8,-12 L0,-16 L-8,-12 Z" fill="#4a4a4a" stroke="#000" strokeWidth="1" />
                <path d="M0,4 L8,0 L8,-12 L0,-16 Z" fill="#1a1a1a" />
            </g>
        </g>
    );
};
