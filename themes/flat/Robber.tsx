import React from 'react';

export const Robber: React.FC = () => {
    return (
        <image
            href="/icons/robber.svg"
            x={-16}
            y={-16}
            width={32}
            height={32}
            style={{ filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.7))` }}
        />
    );
};
