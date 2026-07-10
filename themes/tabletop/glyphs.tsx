import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
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
