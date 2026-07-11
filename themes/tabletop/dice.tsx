import React from 'react';
import { EventDieFace } from '@/core/rules/commodity-constants';
import { TT, shade } from './palette';

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

/** alembic flask (science gate) */
const ScienceEmblem: React.FC = () => (
    <g transform="translate(0, 1)">
        <path d="M -3.5 -11 L 3.5 -11 L 3.5 -4 L 9 5.5 Q 10.5 9.5 6.5 9.5 L -6.5 9.5 Q -10.5 9.5 -9 5.5 Z"
            fill="none" stroke={TT.category.science} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M -6.7 2.8 L 6.7 2.8 L 9 5.5 Q 10.5 9.5 6.5 9.5 L -6.5 9.5 Q -10.5 9.5 -9 5.5 Z" fill={TT.category.science} opacity={0.85} />
        <line x1={-5.5} y1={-12.8} x2={5.5} y2={-12.8} stroke={TT.category.science} strokeWidth={2.2} strokeLinecap="round" />
    </g>
);

/** balance scales (trade gate) */
const TradeEmblem: React.FC = () => (
    <g transform="translate(0, 0.5)" stroke={TT.category.trade} strokeWidth={1.8} strokeLinecap="round">
        <line x1={0} y1={-11} x2={0} y2={9} />
        <line x1={-9.5} y1={-7.5} x2={9.5} y2={-7.5} />
        <path d="M -13.5 1 A 4.4 4.4 0 0 0 -4.7 1" fill={TT.category.trade} />
        <line x1={-9.1} y1={-7.5} x2={-12.4} y2={0.4} strokeWidth={1.1} />
        <line x1={-9.1} y1={-7.5} x2={-5.8} y2={0.4} strokeWidth={1.1} />
        <path d="M 4.7 1 A 4.4 4.4 0 0 0 13.5 1" fill={TT.category.trade} />
        <line x1={9.1} y1={-7.5} x2={5.8} y2={0.4} strokeWidth={1.1} />
        <line x1={9.1} y1={-7.5} x2={12.4} y2={0.4} strokeWidth={1.1} />
        <line x1={-4.5} y1={10.5} x2={4.5} y2={10.5} />
    </g>
);

/** castle gate (politics gate) */
const PoliticsEmblem: React.FC = () => (
    <g transform="translate(0, 1)" fill={TT.category.politics}>
        <rect x={-9.5} y={-4} width={19} height={13.5} />
        {[-9.5, -2.4, 4.7].map(x => (
            <rect key={x} x={x} y={-9} width={4.8} height={6} />
        ))}
        <path d="M -3.4 9.5 L -3.4 3 A 3.4 3.4 0 0 1 3.4 3 L 3.4 9.5 Z" fill={shade(TT.category.politics, 0.6)} />
    </g>
);

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
