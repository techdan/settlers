import React from 'react';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { TT, shade } from './palette';
import { ImprovementGlyph } from './glyphs';

/**
 * Tabletop dice faces (graphics plan Phase 4) — painted wooden dice under the
 * one top-left sun: lit top edge, darkened-own-fill border, drop shadow.
 * Wiring into DiceDisplay happens after the Phase 4 chrome sweep lands.
 */

const PIP_LAYOUTS: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

interface PipDieProps {
    value: number;
    /** die body color */
    body: string;
    /** pip color */
    pip: string;
    size?: number;
    className?: string;
    title?: string;
}

/** A production die — red or yellow body, contrasting pips. */
export const PipDie: React.FC<PipDieProps> = ({ value, body, pip, size = 48, className, title }) => {
    const pips = PIP_LAYOUTS[value] ?? PIP_LAYOUTS[1];
    const off = 11; // pip grid offset from center (in 48-unit space)
    return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} role="img" aria-label={title ?? `Die showing ${value}`}>
            {title && <title>{title}</title>}
            <rect x={2.5} y={4} width={43} height={43} rx={10} fill="#000000" opacity={0.3} />
            <rect x={2} y={2} width={44} height={44} rx={10} fill={body} stroke={shade(body, 0.6)} strokeWidth={2} />
            {/* lit top edge — the sun is top-left */}
            <path d="M 6 12 Q 6 6 12 6 L 36 6 Q 40 6 42 9 Q 34 4.5 24 4.5 Q 14 4.5 6 12 Z" fill="#ffffff" opacity={0.22} />
            {pips.map(([px, py], i) => (
                <g key={i}>
                    <circle cx={24 + px * off} cy={24 + py * off + 0.7} r={4.1} fill={shade(body, 0.62)} />
                    <circle cx={24 + px * off} cy={24 + py * off} r={4.1} fill={pip} />
                </g>
            ))}
        </svg>
    );
};

/* ---------------- event die (C&K) ---------------- */

/** mini drakkar silhouette for the barbarian ship face */
const ShipEmblem: React.FC = () => (
    <g>
        <path d="M -13 4 C -7 11 7 11 13 4 L 9 2.8 C 4.5 7.5 -4.5 7.5 -9 2.8 Z"
            fill={TT.barbarian.hull} stroke={shade(TT.barbarian.hull, 0.6)} strokeWidth={0.9} />
        <rect x={-0.9} y={-14} width={1.8} height={16} fill={shade(TT.barbarian.hull, 0.6)} />
        <rect x={-7.5} y={-13} width={15} height={8.5} rx={0.8} fill={TT.barbarian.sail} />
        <rect x={-7.5} y={-11} width={15} height={2} fill={TT.barbarian.stripe} />
        <rect x={-7.5} y={-7.2} width={15} height={2} fill={TT.barbarian.stripe} />
    </g>
);

const ScienceEmblem: React.FC = () => <ImprovementGlyph type="science" size={25} />;
const TradeEmblem: React.FC = () => <ImprovementGlyph type="trade" size={25} />;
const PoliticsEmblem: React.FC = () => <ImprovementGlyph type="politics" size={25} />;

const EVENT_EMBLEMS: Record<EventDieFace, React.FC> = {
    ship: ShipEmblem,
    science: ScienceEmblem,
    trade: TradeEmblem,
    politics: PoliticsEmblem,
};

/** Ship face is barbarian-dark; gate faces sit on cream. */
const EVENT_BODY: Record<EventDieFace, string> = {
    ship: '#26333d',
    science: TT.token.face,
    trade: TT.token.face,
    politics: TT.token.face,
};

export const EventDie: React.FC<{ face: EventDieFace; size?: number; className?: string; title?: string }> = ({
    face,
    size = 48,
    className,
    title,
}) => {
    const body = EVENT_BODY[face];
    const Emblem = EVENT_EMBLEMS[face];
    return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} role="img" aria-label={title ?? `Event die: ${face}`}>
            {title && <title>{title}</title>}
            <rect x={2.5} y={4} width={43} height={43} rx={10} fill="#000000" opacity={0.3} />
            <rect x={2} y={2} width={44} height={44} rx={10} fill={body} stroke={shade(body, face === 'ship' ? 1.5 : 0.6)} strokeWidth={2} />
            <path d="M 6 12 Q 6 6 12 6 L 36 6 Q 40 6 42 9 Q 34 4.5 24 4.5 Q 14 4.5 6 12 Z" fill="#ffffff" opacity={face === 'ship' ? 0.1 : 0.22} />
            <g transform="translate(24, 24)">
                <Emblem />
            </g>
        </svg>
    );
};
