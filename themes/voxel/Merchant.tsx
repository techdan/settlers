import React from 'react';

export const VoxelMerchant: React.FC = () => {
    return (
        <g>
            {/* Base pedestal */}
            <path d="M-10,8 L0,12 L10,8 L10,0 L0,-4 L-10,0 Z" fill="#0f766e" stroke="#0ea5e9" strokeWidth="1" />
            <path d="M-10,8 L0,12 L0,4 L-10,0 Z" fill="#0a4f4b" />
            <path d="M0,12 L10,8 L10,0 L0,4 Z" fill="#128f7a" />

            {/* Figure */}
            <g transform="translate(0, -6)">
                <path d="M-6,6 L0,10 L6,6 L6,-6 L0,-10 L-6,-6 Z" fill="#22d3ee" stroke="#0f172a" strokeWidth="1" />
                <path d="M0,10 L6,6 L6,-6 L0,-10 Z" fill="#0ea5e9" />
                <circle cy="-5" r="3" fill="#e0f2fe" stroke="#0f172a" strokeWidth="1" />
            </g>
        </g>
    );
};
