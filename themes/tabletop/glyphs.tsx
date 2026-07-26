import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType, ProgressCardCategory } from '@/core/rules/commodity-constants';
import { TT, shade, r2 } from './palette';

/**
 * Miniature glyphs for ports, chips, and (later) cards — drawn in a nominal
 * 20×20 box centered on (0,0), flat two-tone per the art spec (§2.2), so they
 * stay legible at 12–16px rendered size.
 */

export const ResourceGlyph: React.FC<{ type: ResourceType; size?: number }> = ({ type, size = 20 }) => {
    const k = r2(size / 20);
    return <g transform={`scale(${k})`}>{GLYPHS[type]}</g>;
};

const GLYPHS: Record<ResourceType, React.ReactNode> = {
    wood: (
        <g>
            <rect x={-1.4} y={4} width={2.8} height={4.5} fill={TT.terrain.forest.trunk} />
            <polygon points="-7,4.5 7,4.5 0,-3" fill={TT.terrain.forest.canopyDark} />
            <polygon points="-5.2,-1 5.2,-1 0,-9" fill={TT.terrain.forest.canopy} />
            <polygon points="-5.2,-1 0,-9 0,-1" fill={TT.terrain.forest.canopyLight} opacity={0.7} />
        </g>
    ),
    brick: (
        <g>
            {([[-5, 2], [0.6, 2], [-2.2, -3.4]] as [number, number][]).map(([x, y], i) => (
                <rect
                    key={i}
                    x={x} y={y} width={5.2} height={4.4} rx={0.6}
                    fill={i === 2 ? TT.terrain.hill.brick : TT.terrain.hill.brickDark}
                    stroke={TT.terrain.hill.mortar} strokeWidth={0.7}
                />
            ))}
        </g>
    ),
    sheep: (
        <g>
            <ellipse cx={-0.6} cy={0.5} rx={6.4} ry={4.4} fill={TT.terrain.pasture.wool} stroke={TT.terrain.pasture.woolStroke} strokeWidth={0.8} />
            <circle cx={5.4} cy={-1.6} r={2.2} fill={TT.terrain.pasture.face} />
            <rect x={-3.4} y={4.4} width={1.6} height={3} fill={TT.terrain.pasture.face} />
            <rect x={1.4} y={4.4} width={1.6} height={3} fill={TT.terrain.pasture.face} />
        </g>
    ),
    wheat: (
        <g>
            {[-1, 0, 1].map(j => (
                <g key={j}>
                    <line x1={j * 3.4} y1={8} x2={j * 4.6} y2={-4} stroke={TT.terrain.field.stalk} strokeWidth={1.4} />
                    <ellipse
                        cx={j * 4.6} cy={-5.6} rx={1.9} ry={3.2}
                        fill={TT.terrain.field.furrowLight}
                        stroke={TT.terrain.field.stalk} strokeWidth={0.7}
                        transform={`rotate(${j * 14} ${j * 4.6} -5.6)`}
                    />
                </g>
            ))}
        </g>
    ),
    ore: (
        <g>
            <polygon points="-7,6 -4.5,-3 0,-7 6.5,-2.5 7,6" fill={TT.terrain.mountain.peak} />
            <polygon points="-7,6 -4.5,-3 0,-7 0,6" fill={TT.terrain.mountain.facetLight} />
            <polygon points="-2,-5.2 2,-6 1,-3.6" fill={TT.terrain.mountain.snow} opacity={0.85} />
        </g>
    ),
};

/** Knight shield — used on the barbarian route chip */
export const ShieldGlyph: React.FC<{ size?: number; fill?: string }> = ({ size = 12, fill = TT.status.neutral }) => {
    const k = r2(size / 12);
    return (
        <g transform={`scale(${k})`}>
            <path
                d="M 0 -6 L 5 -4.2 L 5 0.5 Q 5 4 0 6.2 Q -5 4 -5 0.5 L -5 -4.2 Z"
                fill={fill}
            />
            <path d="M 0 -6 L -5 -4.2 L -5 0.5 Q -5 4 0 6.2 Z" fill={shade('#cfd9d2', 0.8)} opacity={0.35} />
        </g>
    );
};

/** City tower — used on the barbarian route chip */
export const TowerGlyph: React.FC<{ size?: number; fill?: string }> = ({ size = 12, fill = TT.status.neutral }) => {
    const k = r2(size / 12);
    return (
        <g transform={`scale(${k})`}>
            <rect x={-3.4} y={-2.4} width={6.8} height={8.4} fill={fill} />
            {[-3.4, -0.9, 1.6].map(x => (
                <rect key={x} x={x} y={-5.2} width={1.8} height={2.8} fill={fill} />
            ))}
        </g>
    );
};

/** Crossed swords — landfall marker on the barbarian route */
export const CrossedSwords: React.FC<{ size?: number; fill?: string }> = ({ size = 10, fill = TT.seam }) => {
    const k = r2(size / 10);
    return (
        <g transform={`scale(${k})`}>
            <rect x={-5.5} y={-1} width={11} height={2} rx={0.6} fill={fill} transform="rotate(45)" />
            <rect x={-5.5} y={-1} width={11} height={2} rx={0.6} fill={fill} transform="rotate(-45)" />
        </g>
    );
};

const COMMODITY_GLYPHS: Record<CommodityType, React.ReactNode> = {
    paper: (
        <g>
            <rect x={-6.5} y={-6} width={13} height={12} rx={1.2} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1} />
            {[-3, 0, 3].map(y => <line key={y} x1={-3.8} y1={y} x2={3.8} y2={y} stroke={TT.token.ringInner} strokeWidth={1.2} />)}
            <rect x={-8} y={-7.5} width={2.8} height={15} rx={1.4} fill={shade(TT.token.face, 0.88)} stroke={TT.token.ring} strokeWidth={0.8} />
            <rect x={5.2} y={-7.5} width={2.8} height={15} rx={1.4} fill={shade(TT.token.face, 0.88)} stroke={TT.token.ring} strokeWidth={0.8} />
        </g>
    ),
    cloth: (
        <g>
            {[
                { y: 3, fill: TT.barbarian.stripe },
                { y: -1.8, fill: TT.token.face },
                { y: -6.6, fill: TT.barbarian.stripe },
            ].map(({ y, fill }, index) => (
                <path
                    key={index}
                    d={`M -7 ${y} q 3.5 -2.5 7 0 t 7 0 v 4 q -3.5 2.5 -7 0 t -7 0 Z`}
                    fill={fill}
                    stroke={shade(fill === TT.token.face ? '#cfc0a0' : fill, 0.7)}
                    strokeWidth={0.8}
                />
            ))}
        </g>
    ),
    coin: (
        <g>
            {[[0, 4], [0, 0], [0, -4]].map(([cx, cy], index) => (
                <g key={index}>
                    <ellipse cx={cx} cy={cy + 1.2} rx={6.8} ry={2.6} fill={shade('#e6c34c', 0.72)} />
                    <ellipse cx={cx} cy={cy} rx={6.8} ry={2.6} fill="#e6c34c" stroke={shade('#e6c34c', 0.6)} strokeWidth={0.8} />
                </g>
            ))}
        </g>
    ),
};

export const CommodityGlyph: React.FC<{ type: CommodityType; size?: number }> = ({ type, size = 20 }) => {
    const k = r2(size / 20);
    return <g transform={`scale(${k})`}>{COMMODITY_GLYPHS[type]}</g>;
};

export const ImprovementGlyph: React.FC<{ type: ProgressCardCategory; size?: number }> = ({ type, size = 20 }) => {
    const k = r2(size / 20);
    return <g transform={`scale(${k})`}>{IMPROVEMENT_GLYPHS[type]}</g>;
};

const IMPROVEMENT_GLYPHS: Record<ProgressCardCategory, React.ReactNode> = {
    science: (
        <g transform="translate(0, 1)">
            <path d="M -3 -8 L 3 -8 L 3 -3 L 7 4.5 Q 8.5 8 5.5 8 L -5.5 8 Q -8.5 8 -7 4.5 Z" fill="none" stroke={TT.category.science} strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M -5.4 2 L 5.4 2 L 7 4.5 Q 8.5 8 5.5 8 L -5.5 8 Q -8.5 8 -7 4.5 Z" fill={TT.category.science} opacity={0.85} />
            <line x1={-4.5} y1={-9.5} x2={4.5} y2={-9.5} stroke={TT.category.science} strokeWidth={1.8} strokeLinecap="round" />
        </g>
    ),
    trade: (
        <g stroke={TT.category.trade} strokeWidth={1.6} strokeLinecap="round">
            <line x1={0} y1={-8.5} x2={0} y2={8} />
            <line x1={-8} y1={-6} x2={8} y2={-6} />
            <path d="M -10.5 1 A 3.5 3.5 0 0 0 -3.5 1" fill={TT.category.trade} />
            <line x1={-7} y1={-6} x2={-10} y2={0.5} strokeWidth={1} />
            <line x1={-7} y1={-6} x2={-4} y2={0.5} strokeWidth={1} />
            <path d="M 3.5 1 A 3.5 3.5 0 0 0 10.5 1" fill={TT.category.trade} />
            <line x1={7} y1={-6} x2={4} y2={0.5} strokeWidth={1} />
            <line x1={7} y1={-6} x2={10} y2={0.5} strokeWidth={1} />
            <line x1={-4} y1={9} x2={4} y2={9} />
        </g>
    ),
    politics: (
        <g fill={TT.category.politics}>
            <rect x={-7.5} y={-3} width={15} height={10.5} />
            {[-7.5, -1.9, 3.7].map(x => <rect key={x} x={x} y={-7} width={3.8} height={4.5} />)}
            <path d="M -2.8 7.5 L -2.8 2.5 A 2.8 2.8 0 0 1 2.8 2.5 L 2.8 7.5 Z" fill={shade(TT.category.politics, 0.6)} />
        </g>
    ),
};

export type TabletopStatusType = 'confirm' | 'cancel' | 'warning' | 'info' | 'time' | 'trade' | 'active' | 'inactive';

export const StatusGlyph: React.FC<{ type: TabletopStatusType }> = ({ type }) => {
    switch (type) {
        case 'confirm':
            return <path d="M -7 0 L -2 5 L 7 -6" fill="none" stroke={TT.status.good} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />;
        case 'cancel':
            return <g stroke={TT.status.bad} strokeWidth={2.5} strokeLinecap="round"><line x1={-6} y1={-6} x2={6} y2={6} /><line x1={6} y1={-6} x2={-6} y2={6} /></g>;
        case 'warning':
            return <g><path d="M 0 -8.5 L 9 7 H -9 Z" fill={TT.token.face} stroke={TT.token.red} strokeWidth={1.5} /><line x1={0} y1={-4} x2={0} y2={2} stroke={TT.token.red} strokeWidth={2} strokeLinecap="round" /><circle cx={0} cy={5} r={1.2} fill={TT.token.red} /></g>;
        case 'info':
            return <g><circle r={8} fill={TT.token.face} stroke={TT.highlight.secondary} strokeWidth={1.5} /><line x1={0} y1={-1} x2={0} y2={5} stroke={TT.route.chipInk} strokeWidth={2} strokeLinecap="round" /><circle cx={0} cy={-4.5} r={1.2} fill={TT.route.chipInk} /></g>;
        case 'time':
            return <g><circle r={8} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1.5} /><path d="M 0 -5 V 0 L 4 2.5" fill="none" stroke={TT.token.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></g>;
        case 'trade':
            return <ImprovementGlyph type="trade" size={18} />;
        case 'active':
            return <g><circle r={7} fill={TT.status.good} opacity={0.25} /><circle r={3.5} fill={TT.status.good} /></g>;
        case 'inactive':
            return <g><circle r={7} fill={TT.status.neutral} opacity={0.18} /><circle r={3.5} fill={TT.status.neutral} /></g>;
    }
};

interface StandaloneIconProps {
    size?: number;
    className?: string;
    label?: string;
}

const StandaloneIcon: React.FC<StandaloneIconProps & { children: React.ReactNode }> = ({ size = 24, className, label, children }) => (
    <svg
        viewBox="-10 -10 20 20"
        width={size}
        height={size}
        className={className}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
    >
        {children}
    </svg>
);

export const TabletopResourceIcon: React.FC<StandaloneIconProps & { type: ResourceType }> = ({ type, ...props }) => (
    <StandaloneIcon {...props}><ResourceGlyph type={type} /></StandaloneIcon>
);

export const TabletopCommodityIcon: React.FC<StandaloneIconProps & { type: CommodityType }> = ({ type, ...props }) => (
    <StandaloneIcon {...props}><CommodityGlyph type={type} /></StandaloneIcon>
);

export const TabletopImprovementIcon: React.FC<StandaloneIconProps & { type: ProgressCardCategory }> = ({ type, ...props }) => (
    <StandaloneIcon {...props}><ImprovementGlyph type={type} /></StandaloneIcon>
);

export const TabletopStatusIcon: React.FC<StandaloneIconProps & { type: TabletopStatusType }> = ({ type, ...props }) => (
    <StandaloneIcon {...props}><StatusGlyph type={type} /></StandaloneIcon>
);
