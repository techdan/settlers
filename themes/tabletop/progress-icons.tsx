import React from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { TT, shade } from './palette';
import { Merchant } from './Merchant';

/**
 * Progress-card icons — all 25, drawn in one sitting so they stay one hand.
 * Grammar (user-approved via the card artifact): one object + one accent,
 * ellipse ground shadow, two tones, centered on (0,0) in a ±20 box.
 * Category context (banner + tinted window) is supplied by ProgressCardFace;
 * icons only need to disambiguate within their category.
 */

const CREAM = TT.token.face;
const RING = TT.token.ring;
const INK = TT.token.ink;
const BRASS = TT.highlight.primary;
const SCI = TT.category.science;
const POL = TT.category.politics;
const WOOD = TT.terrain.forest.trunk;
const COIN = '#e6c34c';
const IRON = '#4c4742';
const STONE = '#8b8578';

const Shadow: React.FC<{ y?: number; rx?: number }> = ({ y = 17, rx = 17 }) => (
    <ellipse cy={y} rx={rx} ry={3.3} fill="#000000" opacity={0.15} />
);

/* ---------------- science ---------------- */

const Alchemist: React.FC = () => (
    <g>
        <Shadow y={19} />
        <path d="M -5 -16 L 5 -16 L 5 -6 L 13 8 Q 15 14 9 14 L -9 14 Q -15 14 -13 8 Z"
            fill="none" stroke={SCI} strokeWidth={2.6} strokeLinejoin="round" />
        <path d="M -9.6 4 L 9.6 4 L 13 8 Q 15 14 9 14 L -9 14 Q -15 14 -13 8 Z" fill={SCI} opacity={0.8} />
        <line x1={-8} y1={-18.5} x2={8} y2={-18.5} stroke={SCI} strokeWidth={2.6} strokeLinecap="round" />
        {[[16, -8, 1], [24, -1, 3]].map(([x, y, pips], i) => (
            <g key={i}>
                <rect x={x - 5} y={y - 5} width={10} height={10} rx={2} fill={CREAM} stroke={shade(RING, 0.9)} strokeWidth={1} />
                <circle cx={x} cy={y} r={1.3} fill={pips === 1 ? INK : TT.token.red} />
                {pips === 3 && (
                    <>
                        <circle cx={x - 2.5} cy={y - 2.5} r={1.3} fill={TT.token.red} />
                        <circle cx={x + 2.5} cy={y + 2.5} r={1.3} fill={TT.token.red} />
                    </>
                )}
            </g>
        ))}
    </g>
);

const Crane: React.FC = () => (
    <g>
        <Shadow />
        {/* mast + jib */}
        <rect x={-10} y={-14} width={3.4} height={28} fill={WOOD} />
        <path d="M -10 -14 L 14 -6 L 13 -3 L -10 -10.4 Z" fill={shade(WOOD, 1.25)} />
        <line x1={-8.3} y1={-2} x2={8} y2={-6.5} stroke={shade(WOOD, 0.7)} strokeWidth={1.6} />
        {/* rope + stone block */}
        <line x1={12} y1={-4.5} x2={12} y2={4} stroke={shade(INK, 1.6)} strokeWidth={1.1} />
        <rect x={7} y={4} width={10} height={8} rx={1} fill={STONE} />
        <rect x={7} y={4} width={10} height={2.2} fill={shade(STONE, 1.25)} />
        {/* base */}
        <rect x={-15} y={12} width={14} height={3} rx={1.2} fill={shade(WOOD, 0.8)} />
    </g>
);

const Engineer: React.FC = () => (
    <g>
        <Shadow />
        {/* blueprint */}
        <rect x={-16} y={-3} width={32} height={17} rx={1.4} fill={CREAM} stroke={RING} strokeWidth={1.1} />
        {[2, 7].map(y => <line key={y} x1={-11} y1={y} x2={11} y2={y} stroke={TT.token.ringInner} strokeWidth={1.3} />)}
        {/* dividers */}
        <path d="M 0 -16 L -8 6" stroke={SCI} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path d="M 0 -16 L 8 6" stroke={shade(SCI, 1.3)} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <circle cy={-15} r={2.6} fill={SCI} />
    </g>
);

const Inventor: React.FC = () => (
    <g>
        <Shadow />
        {[[-9, -3], [9, 5]].map(([x, y], i) => (
            <g key={i}>
                <circle cx={x} cy={y + 1.2} r={8} fill="#000" opacity={0.15} />
                <circle cx={x} cy={y} r={8} fill={CREAM} stroke={RING} strokeWidth={1.2} />
                <text x={x} y={y + 3} textAnchor="middle" fontFamily='Georgia, serif' fontSize={8.5} fontWeight={700}
                    fill={i ? TT.token.red : INK}>{i ? '8' : '5'}</text>
            </g>
        ))}
        <path d="M -4 -11 A 12 12 0 0 1 13 -4" fill="none" stroke={SCI} strokeWidth={2} markerEnd="none" />
        <polygon points="13,-8 15.5,-2.5 9.5,-3.5" fill={SCI} />
        <path d="M 4 13 A 12 12 0 0 1 -13 6" fill="none" stroke={SCI} strokeWidth={2} />
        <polygon points="-13,10 -15.5,4.5 -9.5,5.5" fill={SCI} />
    </g>
);

const Irrigation: React.FC = () => (
    <g>
        <Shadow />
        {/* canal */}
        <path d="M -18 6 Q 0 1 18 6 L 18 12 Q 0 7 -18 12 Z" fill="#4e97a3" />
        <path d="M -18 6 Q 0 1 18 6" fill="none" stroke="#bfe0e6" strokeWidth={1.2} opacity={0.7} />
        {/* wheat on the banks */}
        {[-12, -7, 8, 13].map((x, i) => (
            <g key={i}>
                <line x1={x} y1={4} x2={x + 1.6} y2={-9} stroke={TT.terrain.field.stalk} strokeWidth={1.8} />
                <ellipse cx={x + 1.9} cy={-11} rx={2.2} ry={4}
                    fill={TT.terrain.field.furrowLight} stroke={TT.terrain.field.stalk} strokeWidth={0.9} />
            </g>
        ))}
    </g>
);

const Medicine: React.FC = () => (
    <g>
        <Shadow />
        {/* mortar */}
        <path d="M -12 -2 L 12 -2 Q 11 12 0 12 Q -11 12 -12 -2 Z" fill={STONE} />
        <path d="M -12 -2 L 12 -2 Q 11 3 0 3 Q -11 3 -12 -2 Z" fill={shade(STONE, 0.75)} />
        {/* pestle */}
        <g transform="rotate(38 6 -8)">
            <rect x={4} y={-16} width={4} height={14} rx={2} fill={shade(STONE, 1.2)} />
            <ellipse cx={6} cy={-1.5} rx={3.2} ry={2.4} fill={shade(STONE, 1.35)} />
        </g>
        {/* herb sprig accent */}
        <path d="M -8 -6 Q -10 -12 -6 -15" fill="none" stroke={SCI} strokeWidth={1.6} />
        {[[-8.6, -9], [-6.2, -12.5]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={2.6} ry={1.5} fill={SCI} transform={`rotate(${i ? 30 : -35} ${x} ${y})`} />
        ))}
    </g>
);

const Mining: React.FC = () => (
    <g>
        <Shadow />
        {/* ore chunk */}
        <polygon points="-9,14 -13,4 -6,-2 4,0 7,9 0,14" fill={TT.terrain.mountain.peak} />
        <polygon points="-13,4 -6,-2 -6,10 -9,14" fill={TT.terrain.mountain.facetLight} />
        <circle cx={-2} cy={7} r={1.6} fill={BRASS} />
        <circle cx={2} cy={3} r={1.2} fill={BRASS} />
        {/* pick */}
        <g transform="rotate(-30 4 -8)">
            <rect x={2.5} y={-14} width={3} height={18} rx={1.4} fill={WOOD} />
            <path d="M -8 -14 Q 4 -21 16 -14 L 15 -11.5 Q 4 -17.5 -7 -11.5 Z" fill={IRON} />
        </g>
    </g>
);

const Printer: React.FC = () => (
    <g>
        <Shadow />
        {/* press frame + screw */}
        <rect x={-13} y={-16} width={26} height={4} rx={1.4} fill={WOOD} />
        <rect x={-2.4} y={-12} width={4.8} height={8} fill={IRON} />
        <rect x={-6} y={-4.5} width={12} height={3.4} rx={1} fill={shade(IRON, 1.4)} />
        <rect x={-13} y={-16} width={3.4} height={26} fill={shade(WOOD, 0.8)} />
        <rect x={9.6} y={-16} width={3.4} height={26} fill={shade(WOOD, 0.8)} />
        {/* printed page */}
        <rect x={-7.5} y={1} width={15} height={11} rx={1} fill={CREAM} stroke={RING} strokeWidth={1} />
        {[4.4, 7.2, 10].map(y => <line key={y} x1={-4.5} y1={y} x2={4.5} y2={y} stroke={INK} strokeWidth={1.1} opacity={0.65} />)}
    </g>
);

const RoadBuildingProgress: React.FC = () => (
    <g>
        <Shadow y={16} />
        {[-28, 28].map((deg, i) => (
            <g key={i} transform={`rotate(${deg})`}>
                <rect x={-4.5} y={-15} width={9} height={30} rx={3.5}
                    fill={i ? shade(WOOD, 1.25) : WOOD} stroke={shade(WOOD, 0.55)} strokeWidth={1.4} />
                <rect x={-3.1} y={-13} width={2.4} height={26} rx={1.2} fill="#ffffff" opacity={0.25} />
            </g>
        ))}
    </g>
);

const Smith: React.FC = () => (
    <g>
        <Shadow />
        <path d="M -16 -4 L 16 -4 Q 20 -4 20 -1 Q 14 3 8 3 L 6 10 L 12 14 L -14 14 L -8 10 L -10 3 L -16 3 Z" fill={IRON} />
        <path d="M -16 -4 L 16 -4 Q 20 -4 20 -1 L -16 -1 Z" fill={shade(IRON, 1.5)} />
        <g transform="translate(8,-16) rotate(35)">
            <rect x={-2} y={-2} width={4} height={16} rx={1.5} fill={WOOD} />
            <rect x={-7} y={-8} width={14} height={7} rx={1.5} fill={IRON} />
            <rect x={-7} y={-8} width={14} height={2.4} rx={1.2} fill={shade(IRON, 1.5)} />
        </g>
    </g>
);

/* ---------------- trade ---------------- */

const CommercialHarbor: React.FC = () => (
    <g>
        <Shadow />
        {/* pier */}
        <rect x={-18} y={9} width={24} height={3.6} rx={1} fill={TT.port.pier} />
        {[-14, -8, -2].map(x => <rect key={x} x={x} y={12} width={2.6} height={5} fill={shade(TT.port.pier, 0.7)} />)}
        {/* dock crane */}
        <rect x={-13} y={-13} width={3.2} height={22} fill={WOOD} />
        <path d="M -13 -13 L 10 -7 L 9.3 -4.4 L -13 -9.8 Z" fill={shade(WOOD, 1.25)} />
        <line x1={8} y1={-5.5} x2={8} y2={1} stroke={shade(INK, 1.6)} strokeWidth={1.1} />
        {/* crate */}
        <rect x={3.5} y={1} width={9} height={9} rx={1} fill={TT.port.plank} stroke={shade(TT.port.plank, 0.6)} strokeWidth={1} />
        <line x1={3.5} y1={5.5} x2={12.5} y2={5.5} stroke={shade(TT.port.plank, 0.6)} strokeWidth={1} />
        <line x1={8} y1={1} x2={8} y2={10} stroke={shade(TT.port.plank, 0.6)} strokeWidth={1} />
    </g>
);

const GuildDues: React.FC = () => (
    <g>
        <Shadow />
        {/* coin purse */}
        <path d="M -4 -9 Q -13 -4 -13.5 4 Q -14 13 0 13 Q 14 13 13.5 4 Q 13 -4 4 -9 Z"
            fill="#8a6a45" stroke={shade('#8a6a45', 0.65)} strokeWidth={1.3} />
        <path d="M -4 -9 Q -13 -4 -13.5 4 Q -14 13 0 13 L 0 -9 Z" fill={shade('#8a6a45', 1.15)} />
        <path d="M -6 -9 Q 0 -12.5 6 -9 L 5 -6 Q 0 -8.5 -5 -6 Z" fill={shade('#8a6a45', 0.7)} />
        {/* guild ribbon seal */}
        <rect x={-2.2} y={-15} width={4.4} height={7} fill={TT.category.trade} />
        <circle cy={-7} r={3.4} fill={BRASS} stroke={shade(BRASS, 0.65)} strokeWidth={0.9} />
    </g>
);

const MerchantIcon: React.FC = () => (
    <g transform="translate(0, 1) scale(1.15)">
        <Merchant />
    </g>
);

const MerchantFleet: React.FC = () => (
    <g>
        <Shadow y={16} rx={19} />
        <path d="M -17 4 C -9 13 9 13 17 4 L 12 2.5 C 6 9 -6 9 -12 2.5 Z"
            fill={WOOD} stroke={shade(WOOD, 0.6)} strokeWidth={1} />
        <rect x={-1.2} y={-19} width={2.4} height={20} fill={shade(WOOD, 0.6)} />
        <path d="M -11 -18 L 11 -18 L 11 -4 L -11 -4 Z" fill={CREAM} stroke={RING} strokeWidth={1} />
        <path d="M -11 -13 L 0 -8.5 L 11 -13 L 11 -8 L 0 -3.5 L -11 -8 Z" fill={BRASS} />
        <polygon points="0,-24 8,-21.5 0,-19" fill={TT.category.trade} />
    </g>
);

const ResourceMonopoly: React.FC = () => (
    <g>
        <Shadow />
        <path d="M -3 -14 Q -12 -8 -13 2 Q -13.5 14 0 14 Q 13.5 14 13 2 Q 12 -8 3 -14 Z"
            fill="#a9855a" stroke={shade('#a9855a', 0.65)} strokeWidth={1.3} />
        <path d="M -3 -14 Q -12 -8 -13 2 Q -13.5 14 0 14 L 0 -14 Z" fill={shade('#a9855a', 1.15)} />
        <path d="M -5 -14 Q 0 -17 5 -14 L 4 -11 Q 0 -13.5 -4 -11 Z" fill={shade('#a9855a', 0.7)} />
        {[[16, 8], [21, 12]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={4.4} ry={3.6} fill={COIN} stroke={shade(COIN, 0.6)} strokeWidth={1} />
        ))}
    </g>
);

const TradeMonopoly: React.FC = () => (
    <g>
        <Shadow />
        <g transform="rotate(-9)">
            <line x1={0} y1={-13} x2={0} y2={12} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
            <line x1={-14} y1={-9} x2={14} y2={-9} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
            {/* heavy pan (coins) */}
            <path d="M -20 2 A 6.5 6.5 0 0 0 -7 2" fill={INK} opacity={0.85} />
            <line x1={-13.5} y1={-9} x2={-18.5} y2={1} stroke={INK} strokeWidth={1.3} />
            <line x1={-13.5} y1={-9} x2={-8.5} y2={1} stroke={INK} strokeWidth={1.3} />
            <ellipse cx={-13.5} cy={0} rx={4} ry={2.6} fill={COIN} stroke={shade(COIN, 0.6)} strokeWidth={0.9} />
            <ellipse cx={-12} cy={-2} rx={4} ry={2.6} fill={COIN} stroke={shade(COIN, 0.6)} strokeWidth={0.9} />
            {/* light pan */}
            <path d="M 7 -4 A 6.5 6.5 0 0 0 20 -4" fill={INK} opacity={0.85} />
            <line x1={13.5} y1={-9} x2={8.5} y2={-5} stroke={INK} strokeWidth={1.3} />
            <line x1={13.5} y1={-9} x2={18.5} y2={-5} stroke={INK} strokeWidth={1.3} />
        </g>
        <line x1={-7} y1={13} x2={7} y2={13} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </g>
);

/* ---------------- politics ---------------- */

const Constitution: React.FC = () => (
    <g>
        <Shadow />
        {/* rolled charter */}
        <rect x={-13} y={-12} width={26} height={22} rx={1.6} fill={CREAM} stroke={RING} strokeWidth={1.2} />
        {[-6, -1, 4].map(y => <line key={y} x1={-8} y1={y} x2={8} y2={y} stroke={TT.token.ringInner} strokeWidth={1.4} />)}
        <rect x={-16} y={-13.5} width={5} height={25} rx={2.5} fill={shade(CREAM, 0.88)} stroke={RING} strokeWidth={1.1} />
        {/* ribbon + wax seal */}
        <path d="M 6 8 L 10 18 L 12.5 14.5 L 16 17 L 13 7 Z" fill={POL} />
        <circle cx={10} cy={8} r={4.6} fill={BRASS} stroke={shade(BRASS, 0.65)} strokeWidth={1} />
        <circle cx={10} cy={8} r={2.2} fill="none" stroke={shade(BRASS, 0.7)} strokeWidth={0.9} />
    </g>
);

const Diplomat: React.FC = () => (
    <g>
        <Shadow y={16} rx={18} />
        <rect x={-15} y={-9} width={30} height={20} rx={1.6} fill={CREAM} stroke={RING} strokeWidth={1.2} />
        {[-4, 1, 6].map(y => <line key={y} x1={-10} y1={y} x2={10} y2={y} stroke={TT.token.ringInner} strokeWidth={1.4} />)}
        <rect x={-18} y={-10.5} width={5} height={23} rx={2.5} fill={shade(CREAM, 0.88)} stroke={RING} strokeWidth={1.1} />
        <g transform="translate(9,-8) rotate(-38)">
            <path d="M 0 12 C -3 4 -3 -4 0 -13 C 3 -4 3 4 0.8 10.5 Z" fill={POL} />
            <path d="M 0 12 C -3 4 -3 -4 0 -13 L 0 12 Z" fill={shade(POL, 1.35)} />
            <line x1={0} y1={12} x2={0} y2={16} stroke={shade(POL, 0.7)} strokeWidth={1.6} strokeLinecap="round" />
        </g>
    </g>
);

const Encouragement: React.FC = () => (
    <g>
        <Shadow />
        {/* standard pole */}
        <rect x={-8} y={-17} width={2.6} height={31} rx={1.2} fill={WOOD} />
        <circle cx={-6.7} cy={-18.5} r={2.2} fill={BRASS} />
        {/* rallying banner */}
        <path d="M -5 -15 L 15 -15 L 11 -8.5 L 15 -2 L -5 -2 Z" fill={POL} />
        <path d="M -5 -15 L 5 -15 L 5 -2 L -5 -2 Z" fill={shade(POL, 1.3)} />
        <path d="M -5 -15 L 15 -15 L 11 -8.5 L 15 -2 L -5 -2 Z" fill="none" stroke={shade(POL, 0.65)} strokeWidth={1} />
    </g>
);

const Espionage: React.FC = () => (
    <g>
        <Shadow y={12} rx={16} />
        {/* domino half-mask */}
        <path d="M -16 -4 Q -16 -11 0 -11 Q 16 -11 16 -4 Q 16 6 9 6 Q 4 6 2.5 1.5 Q 1.5 -1 0 -1 Q -1.5 -1 -2.5 1.5 Q -4 6 -9 6 Q -16 6 -16 -4 Z"
            fill={shade(INK, 1.25)} />
        <path d="M -16 -4 Q -16 -11 0 -11 L 0 -1 Q -1.5 -1 -2.5 1.5 Q -4 6 -9 6 Q -16 6 -16 -4 Z" fill={shade(INK, 1.7)} />
        <ellipse cx={-7.5} cy={-3.5} rx={3.6} ry={2.4} fill={CREAM} />
        <ellipse cx={7.5} cy={-3.5} rx={3.6} ry={2.4} fill={CREAM} />
        {/* tie ribbons */}
        <path d="M 16 -4 Q 21 -6 23 -10" fill="none" stroke={shade(INK, 1.25)} strokeWidth={1.6} />
        <path d="M -16 -4 Q -21 -6 -23 -10" fill="none" stroke={shade(INK, 1.25)} strokeWidth={1.6} />
    </g>
);

const Intrigue: React.FC = () => (
    <g>
        <Shadow />
        {/* dagger behind */}
        <g transform="rotate(42)">
            <path d="M 0 -17 L 2.2 -3 L 0 0 L -2.2 -3 Z" fill={shade(STONE, 1.3)} />
            <path d="M 0 -17 L 2.2 -3 L 0 0 Z" fill={STONE} />
            <rect x={-4.5} y={0} width={9} height={2.4} rx={1} fill={BRASS} />
            <rect x={-1.6} y={2.4} width={3.2} height={7} rx={1.4} fill={shade(WOOD, 0.85)} />
        </g>
        {/* sealed letter in front */}
        <rect x={-14} y={-1} width={24} height={15} rx={1.4} fill={CREAM} stroke={RING} strokeWidth={1.2} />
        <path d="M -14 -1 L -2 8 L 10 -1" fill="none" stroke={RING} strokeWidth={1.1} />
        <circle cx={-2} cy={8.5} r={3} fill={TT.token.red} stroke={shade(TT.token.red, 0.7)} strokeWidth={0.8} />
    </g>
);

const Saboteur: React.FC = () => (
    <g>
        <Shadow y={16} rx={18} />
        <rect x={-17} y={-4} width={34} height={16} rx={1.8} fill={STONE} />
        {[-17, -8.2, 0.6, 9.4].map(x => <rect key={x} x={x} y={-9.5} width={6.2} height={6.5} rx={1} fill={STONE} />)}
        <rect x={-17} y={-4} width={34} height={3} fill={shade(STONE, 1.25)} />
        <path d="M 2 -9.5 L -1 -2 L 3 1 L -2 12" fill="none" stroke={shade(STONE, 0.42)} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M -1 -2 L -6 0" fill="none" stroke={shade(STONE, 0.42)} strokeWidth={1.8} />
    </g>
);

const Taxation: React.FC = () => (
    <g>
        <Shadow />
        {/* strongbox */}
        <rect x={-13} y={-2} width={26} height={15} rx={2} fill={WOOD} stroke={shade(WOOD, 0.6)} strokeWidth={1.2} />
        <path d="M -13 -2 Q 0 -9 13 -2 Z" fill={shade(WOOD, 1.2)} stroke={shade(WOOD, 0.6)} strokeWidth={1.2} />
        <rect x={-13} y={2} width={26} height={2.2} fill={shade(WOOD, 0.7)} />
        <rect x={-2.6} y={-6.2} width={5.2} height={1.8} rx={0.9} fill={shade(WOOD, 0.5)} />
        {/* coin dropping in */}
        <ellipse cx={0} cy={-12} rx={4.2} ry={3.4} fill={COIN} stroke={shade(COIN, 0.6)} strokeWidth={1} />
        {/* hasp */}
        <rect x={-2} y={6} width={4} height={4.6} rx={1} fill={BRASS} />
    </g>
);

const Treason: React.FC = () => (
    <g>
        <Shadow />
        {/* toppled crown */}
        <g transform="translate(-4, 6) rotate(-24)">
            <polygon points="-11,-2 -7.5,-9 -3.5,-3.5 0,-10.5 3.5,-3.5 7.5,-9 11,-2 11,2 -11,2" fill={BRASS} />
            <rect x={-11} y={2} width={22} height={3} rx={1.2} fill={shade(BRASS, 0.75)} />
        </g>
        {/* dagger */}
        <g transform="translate(9,-6) rotate(155)">
            <path d="M 0 -14 L 2 -2.5 L 0 0 L -2 -2.5 Z" fill={shade(STONE, 1.3)} />
            <path d="M 0 -14 L 2 -2.5 L 0 0 Z" fill={STONE} />
            <rect x={-4} y={0} width={8} height={2.2} rx={1} fill={POL} />
            <rect x={-1.4} y={2.2} width={2.8} height={6} rx={1.2} fill={shade(WOOD, 0.85)} />
        </g>
    </g>
);

const Wedding: React.FC = () => (
    <g>
        <Shadow y={13} rx={15} />
        <circle cx={-5} cy={0} r={8.5} fill="none" stroke={BRASS} strokeWidth={3} />
        <circle cx={-5} cy={0} r={8.5} fill="none" stroke={shade(BRASS, 1.3)} strokeWidth={1} opacity={0.7} />
        <circle cx={6} cy={2} r={8.5} fill="none" stroke={shade(BRASS, 0.85)} strokeWidth={3} />
        <circle cx={2.8} cy={-5.8} r={1.8} fill={CREAM} stroke={shade(BRASS, 0.7)} strokeWidth={0.8} />
    </g>
);

/* ---------------- registry ---------------- */

export const PROGRESS_ICONS: Record<ProgressCardType, React.FC> = {
    // science
    alchemist: Alchemist,
    crane: Crane,
    engineer: Engineer,
    inventor: Inventor,
    irrigation: Irrigation,
    medicine: Medicine,
    mining: Mining,
    printer: Printer,
    road_building_progress: RoadBuildingProgress,
    smith: Smith,
    // trade
    commercial_harbor: CommercialHarbor,
    guild_dues: GuildDues,
    merchant: MerchantIcon,
    merchant_fleet: MerchantFleet,
    resource_monopoly: ResourceMonopoly,
    trade_monopoly: TradeMonopoly,
    // politics
    constitution: Constitution,
    diplomat: Diplomat,
    encouragement: Encouragement,
    espionage: Espionage,
    intrigue: Intrigue,
    saboteur: Saboteur,
    taxation: Taxation,
    treason: Treason,
    wedding: Wedding,
};
