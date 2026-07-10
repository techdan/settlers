import React from 'react';
import { Port as PortData, PortType } from '@/lib/types/board';
import { ResourceType } from '@/core/rules/board-constants';
import { ResourceGlyph } from './glyphs';
import { TT, TT_SERIF, shade, r2 } from './palette';

interface PortProps {
    port: PortData;
}

const PORT_RESOURCE: Record<PortType, ResourceType | null> = {
    wood: 'wood',
    brick: 'brick',
    sheep: 'sheep',
    wheat: 'wheat',
    ore: 'ore',
    generic: null,
};

/** Pennant color = the terrain that produces the resource; brass for 3:1 */
const PENNANT: Record<PortType, string> = {
    wood: TT.terrain.forest.base,
    brick: TT.terrain.hill.base,
    sheep: TT.terrain.pasture.base,
    wheat: TT.terrain.field.base,
    ore: TT.terrain.mountain.base,
    generic: TT.port.generic,
};

/**
 * Tabletop port — wooden pier planks reaching to the two harbor corners,
 * a cream trading sign with the resource glyph and exchange rate, and a
 * terrain-colored pennant so port types read at a glance from zoom-out.
 */
export const Port: React.FC<PortProps> = ({ port }) => {
    const resource = PORT_RESOURCE[port.type];
    const pennant = PENNANT[port.type];

    const posX = r2(port.position.x);
    const posY = r2(port.position.y);
    const v1 = port.vertices
        ? { x: r2(port.vertices[0].x - port.position.x), y: r2(port.vertices[0].y - port.position.y) }
        : { x: 0, y: 0 };
    const v2 = port.vertices
        ? { x: r2(port.vertices[1].x - port.position.x), y: r2(port.vertices[1].y - port.position.y) }
        : { x: 0, y: 0 };

    return (
        <g transform={`translate(${posX}, ${posY})`}>
            {/* pier planks to the two harbor corners */}
            {[v1, v2].map((v, i) => (
                <g key={i}>
                    <line x1={0} y1={0} x2={v.x} y2={v.y} stroke={TT.port.pier} strokeWidth={4.5} strokeLinecap="round" />
                    <line x1={0} y1={0} x2={v.x} y2={v.y} stroke={TT.port.plank} strokeWidth={1.6} strokeDasharray="3 2.4" />
                </g>
            ))}

            {/* sign shadow + face + rope ring */}
            <circle cy={1.5} r={16} fill="#000000" opacity={0.25} />
            <circle r={16} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1.4} />
            <circle r={13} fill="none" stroke={TT.token.ringInner} strokeWidth={0.9} strokeDasharray="2.4 2" />

            {/* pennant */}
            <line x1={0} y1={-15} x2={0} y2={-25} stroke={TT.port.pier} strokeWidth={1.6} />
            <polygon
                points="0,-25 11,-21.5 0,-18"
                fill={pennant}
                stroke={shade(pennant, 0.7)}
                strokeWidth={0.7}
            />

            {resource ? (
                <>
                    <g transform="translate(0, -3.5)">
                        <ResourceGlyph type={resource} size={15} />
                    </g>
                    <text
                        y={11.5}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight={700}
                        fontFamily={TT_SERIF}
                        fill={TT.token.ink}
                    >
                        2:1
                    </text>
                </>
            ) : (
                <text
                    y={4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fontFamily={TT_SERIF}
                    fill={TT.token.ink}
                >
                    3:1
                </text>
            )}
        </g>
    );
};
