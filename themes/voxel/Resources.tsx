import React from 'react';

export const VoxelTree: React.FC = () => (
    <g transform="translate(0, -10)">
        {/* Trunk */}
        <path d="M-4,0 L4,0 L4,-10 L-4,-10 Z" fill="#5D4037" />
        <path d="M4,0 L6,-2 L6,-12 L4,-10 Z" fill="#3E2723" /> {/* Side shading */}

        {/* Leaves - Cone layers */}
        <g transform="translate(0, -10)">
            <path d="M-12,0 L12,0 L0,-20 Z" fill="#2E7D32" />
            <path d="M0,0 L12,0 L0,-20 Z" fill="#1B5E20" opacity="0.3" /> {/* Shading */}
        </g>
        <g transform="translate(0, -20)">
            <path d="M-10,0 L10,0 L0,-18 Z" fill="#388E3C" />
            <path d="M0,0 L10,0 L0,-18 Z" fill="#1B5E20" opacity="0.3" />
        </g>
    </g>
);

export const VoxelMountain: React.FC = () => (
    <g transform="translate(0, -5)">
        {/* Main Peak */}
        <path d="M-15,10 L15,10 L0,-25 Z" fill="#78909C" />
        <path d="M0,10 L15,10 L0,-25 Z" fill="#546E7A" /> {/* Shading right side */}

        {/* Snow Cap */}
        <path d="M-4.5,-17 L4.5,-17 L0,-25 Z" fill="#ECEFF1" />

        {/* Small side peak */}
        <g transform="translate(-10, 5) scale(0.6)">
            <path d="M-15,10 L15,10 L0,-25 Z" fill="#78909C" />
            <path d="M0,10 L15,10 L0,-25 Z" fill="#546E7A" />
        </g>
    </g>
);

export const VoxelWheat: React.FC = () => (
    <g transform="translate(0, 0)">
        {/* Sheaf 1 */}
        <g transform="rotate(-15) translate(-5,0)">
            <ellipse cx="0" cy="-10" rx="3" ry="12" fill="#FFD54F" />
            <path d="M-1,-10 L1,-10" stroke="#F57F17" strokeWidth="1" />
        </g>
        {/* Sheaf 2 */}
        <g transform="rotate(15) translate(5,0)">
            <ellipse cx="0" cy="-10" rx="3" ry="12" fill="#FFCA28" />
        </g>
        {/* Sheaf 3 (Center) */}
        <g transform="translate(0,2)">
            <ellipse cx="0" cy="-12" rx="3.5" ry="13" fill="#FFECB3" />
        </g>
        {/* Band */}
        <rect x="-6" y="-8" width="12" height="4" fill="#8D6E63" rx="2" />
    </g>
);

export const VoxelBrick: React.FC = () => (
    <g transform="translate(0, -5)">
        {/* Stack of bricks */}
        <g transform="translate(-8, 5)">
            <path d="M0,0 L10,0 L10,-6 L0,-6 Z" fill="#D84315" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M10,0 L14,-3 L14,-9 L10,-6 Z" fill="#BF360C" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M0,-6 L10,-6 L14,-9 L4,-9 Z" fill="#FF7043" stroke="#3E2723" strokeWidth="0.5" />
        </g>
        <g transform="translate(2, 0)">
            <path d="M0,0 L10,0 L10,-6 L0,-6 Z" fill="#D84315" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M10,0 L14,-3 L14,-9 L10,-6 Z" fill="#BF360C" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M0,-6 L10,-6 L14,-9 L4,-9 Z" fill="#FF7043" stroke="#3E2723" strokeWidth="0.5" />
        </g>
        <g transform="translate(-4, -6)">
            <path d="M0,0 L10,0 L10,-6 L0,-6 Z" fill="#D84315" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M10,0 L14,-3 L14,-9 L10,-6 Z" fill="#BF360C" stroke="#3E2723" strokeWidth="0.5" />
            <path d="M0,-6 L10,-6 L14,-9 L4,-9 Z" fill="#FF7043" stroke="#3E2723" strokeWidth="0.5" />
        </g>
    </g>
);

export const VoxelSheep: React.FC = () => (
    <g transform="translate(0, -5)">
        {/* Body */}
        <ellipse cx="0" cy="-5" rx="10" ry="8" fill="#F5F5F5" />
        <circle cx="-4" cy="-8" r="4" fill="#F5F5F5" />
        <circle cx="0" cy="-10" r="4" fill="#F5F5F5" />
        <circle cx="4" cy="-8" r="4" fill="#F5F5F5" />

        {/* Head */}
        <g transform="translate(-12, -8)">
            <ellipse cx="0" cy="0" rx="4" ry="5" fill="#424242" />
            <circle cx="-2" cy="-2" r="1" fill="white" /> {/* Eye */}
        </g>

        {/* Legs */}
        <rect x="-6" y="0" width="3" height="6" fill="#424242" />
        <rect x="3" y="0" width="3" height="6" fill="#424242" />
    </g>
);

export const VoxelDesert: React.FC = () => (
    <g transform="translate(0, -5)">
        {/* Dune */}
        <path d="M-15,5 Q0,-10 15,5 Z" fill="#FBC02D" />

        {/* Cactus */}
        <g transform="translate(0, -5)">
            <rect x="-2" y="-15" width="4" height="20" rx="2" fill="#66BB6A" />
            <rect x="-8" y="-10" width="8" height="3" rx="1.5" fill="#66BB6A" />
            <rect x="-8" y="-14" width="3" height="6" rx="1.5" fill="#66BB6A" />

            <rect x="2" y="-8" width="6" height="3" rx="1.5" fill="#66BB6A" />
            <rect x="5" y="-12" width="3" height="6" rx="1.5" fill="#66BB6A" />
        </g>
    </g>
);
