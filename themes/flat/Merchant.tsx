import React from 'react';
import { ColoredSvgIcon } from '@/components/ui/icons/ColoredSvgIcon';

interface MerchantProps {
    color?: string;
}

export const Merchant: React.FC<MerchantProps> = ({ color }) => {
    // Default to green merchant color if no player color provided
    const iconColor = color || '#16a34a';

    return (
        <g transform="translate(0, -12)">
            {/* Mustache icon with colored background */}
            <foreignObject x="-16" y="-16" width="32" height="32">
                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ColoredSvgIcon
                        src="/icons/mustache.svg"
                        color="#000000"
                        backgroundColor={iconColor}
                        size={32}
                        alt="Merchant"
                    />
                </div>
            </foreignObject>
        </g>
    );
};
