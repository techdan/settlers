import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType, ProgressCardCategory } from '@/core/rules/commodity-constants';
import { ProgressCardType, DevCardType } from '@/lib/types/player';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { TT, TT_SERIF, shade, mix } from './palette';
import { PROGRESS_ICONS } from './progress-icons';

/**
 * Tabletop card faces — resource and commodity cards plus progress deck backs,
 * echoing the physical C&K deck: cream stock, brass double rule, an art window
 * with a miniature terrain scene, serif name plate (art spec §2).
 *
 * Each face is a standalone <svg> sized by `width` (aspect locked 96:134) so
 * the hand tray can lay them out as HTML flex children.
 */

const CARD_W = 96;
const CARD_H = 134;
const MONO = '"Cascadia Code", Consolas, monospace';

interface FaceProps {
    width?: number;
    className?: string;
}

/* ---------------- name fitting ---------------- */

/**
 * Long names wrap to two balanced lines; only a single long word shrinks.
 * Usable width inside the frame ≈ 80 units (user-reported overflow fix).
 */
const MAX_NAME_W = 80;
const estW = (s: string, size: number) => s.length * size * 0.52;

function splitName(name: string): [string, string] | null {
    const words = name.split(' ');
    if (words.length < 2) return null;
    let best: [string, string] | null = null;
    let bestLongest = Infinity;
    for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' ');
        const b = words.slice(i).join(' ');
        const longest = Math.max(a.length, b.length);
        if (longest < bestLongest) {
            bestLongest = longest;
            best = [a, b];
        }
    }
    return best;
}

interface NameFitOpts {
    base: number;
    singleY: number;
    twoYs: [number, number];
    twoSize: number;
    fill?: string;
}

/** Returns the fitted <text> element(s) plus how many lines were used. */
function fitName(name: string, opt: NameFitOpts): { nodes: React.ReactNode; lines: 1 | 2 } {
    const attrs = (size: number) => ({
        x: 48,
        textAnchor: 'middle' as const,
        fontFamily: TT_SERIF,
        fontSize: size,
        fontWeight: 700,
        fill: opt.fill ?? TT.token.ink,
    });
    if (estW(name, opt.base) <= MAX_NAME_W) {
        return { nodes: <text {...attrs(opt.base)} y={opt.singleY}>{name}</text>, lines: 1 };
    }
    const sp = splitName(name);
    if (sp) {
        const longest = Math.max(sp[0].length, sp[1].length);
        const size = Math.min(opt.twoSize, MAX_NAME_W / (longest * 0.52));
        return {
            nodes: (
                <>
                    <text {...attrs(size)} y={opt.twoYs[0]}>{sp[0]}</text>
                    <text {...attrs(size)} y={opt.twoYs[1]}>{sp[1]}</text>
                </>
            ),
            lines: 2,
        };
    }
    const size = Math.max(8.5, MAX_NAME_W / (name.length * 0.52));
    return { nodes: <text {...attrs(size)} y={opt.singleY}>{name}</text>, lines: 1 };
}

/* ---------------- shared frame ---------------- */

const Frame: React.FC<{
    windowFill: string;
    name: string;
    caption: string;
    children: React.ReactNode; // scene, drawn in window coords (center ≈ 48,44)
    width: number;
    className?: string;
}> = ({ windowFill, name, caption, children, width, className }) => (
    <svg
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        width={width}
        height={Math.round((width * CARD_H) / CARD_W)}
        className={className}
        role="img"
        aria-label={`${name} card`}
    >
        <rect x={1} y={1} width={94} height={132} rx={7} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={2} />
        <rect x={5.5} y={5.5} width={85} height={123} rx={4.5} fill="none" stroke={TT.token.ringInner} strokeWidth={1} />
        <g>
            <rect x={10} y={10} width={76} height={70} rx={3} fill={windowFill} />
            {children}
            <rect x={10} y={10} width={76} height={70} rx={3} fill="none" stroke={shade(windowFill, 0.7)} strokeWidth={1.4} />
        </g>
        {fitName(name, { base: 15, singleY: 102, twoYs: [96.5, 108], twoSize: 12 }).nodes}
        <text x={48} y={118} textAnchor="middle" fontFamily={MONO} fontSize={6.5} letterSpacing={1.6} fill={TT.token.ring}>
            {caption}
        </text>
    </svg>
);

/* ---------------- window scenes (window rect: x 10-86, y 10-80) ---------------- */

const Tree: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.forest;
    return (
        <g>
            <ellipse cx={x} cy={y + k * 1.15} rx={k * 0.9} ry={k * 0.28} fill="#000" opacity={0.18} />
            <rect x={x - k * 0.12} y={y + k * 0.55} width={k * 0.24} height={k * 0.55} fill={c.trunk} />
            <polygon points={`${x - k * 0.75},${y + k * 0.7} ${x + k * 0.75},${y + k * 0.7} ${x},${y - k * 0.35}`} fill={c.canopyDark} />
            <polygon points={`${x - k * 0.55},${y + k * 0.05} ${x + k * 0.55},${y + k * 0.05} ${x},${y - k}`} fill={c.canopy} />
            <polygon points={`${x - k * 0.55},${y + k * 0.05} ${x},${y - k} ${x},${y + k * 0.05}`} fill={c.canopyLight} opacity={0.7} />
        </g>
    );
};

const BrickStack: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.hill;
    const rows: React.ReactNode[] = [];
    for (let r = 0; r < 3; r++) {
        const n = 3 - r;
        for (let col = 0; col < n; col++) {
            rows.push(
                <rect
                    key={`${r}-${col}`}
                    x={x - (n * k * 0.55) / 2 + col * k * 0.55}
                    y={y - r * k * 0.34}
                    width={k * 0.5}
                    height={k * 0.28}
                    rx={k * 0.04}
                    fill={r % 2 ? c.brickDark : c.brick}
                    stroke={c.mortar}
                    strokeWidth={k * 0.045}
                />
            );
        }
    }
    return <g>{rows}</g>;
};

const SheepFig: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.pasture;
    return (
        <g>
            <ellipse cx={x} cy={y + k * 0.5} rx={k * 0.75} ry={k * 0.18} fill="#000" opacity={0.15} />
            <ellipse cx={x} cy={y} rx={k * 0.7} ry={k * 0.45} fill={c.wool} stroke={c.woolStroke} strokeWidth={k * 0.06} />
            <circle cx={x + k * 0.62} cy={y - k * 0.18} r={k * 0.22} fill={c.face} />
        </g>
    );
};

const Peak: React.FC<{ x: number; y: number; k: number; body: string; facet: string }> = ({ x, y, k, body, facet }) => (
    <g>
        <polygon points={`${x - k},${y + k * 0.75} ${x + k},${y + k * 0.75} ${x},${y - k}`} fill={body} />
        <polygon points={`${x - k},${y + k * 0.75} ${x},${y - k} ${x},${y + k * 0.75}`} fill={facet} />
        <polygon
            points={`${x - k * 0.28},${y - k * 0.44} ${x + k * 0.28},${y - k * 0.44} ${x + k * 0.16},${y - k * 0.68} ${x},${y - k} ${x - k * 0.13},${y - k * 0.6}`}
            fill={TT.terrain.mountain.snow}
        />
    </g>
);

const RESOURCE_SCENES: Record<ResourceType, { bg: string; scene: React.ReactNode }> = {
    wood: {
        bg: TT.terrain.forest.base,
        scene: (
            <g>
                <ellipse cx={48} cy={68} rx={34} ry={8} fill={TT.terrain.forest.under} opacity={0.55} />
                <Tree x={32} y={44} k={14} />
                <Tree x={60} y={38} k={17} />
                <Tree x={48} y={56} k={11} />
            </g>
        ),
    },
    brick: {
        bg: TT.terrain.hill.base,
        scene: (
            <g>
                <ellipse cx={48} cy={66} rx={34} ry={9} fill={TT.terrain.hill.ground} opacity={0.7} />
                <BrickStack x={36} y={56} k={16} />
                <BrickStack x={62} y={44} k={12} />
            </g>
        ),
    },
    sheep: {
        bg: TT.terrain.pasture.base,
        scene: (
            <g>
                <ellipse cx={40} cy={38} rx={26} ry={14} fill={TT.terrain.pasture.patchLight} opacity={0.8} />
                <ellipse cx={60} cy={62} rx={24} ry={12} fill={TT.terrain.pasture.patchDark} opacity={0.7} />
                <SheepFig x={38} y={52} k={13} />
                <SheepFig x={62} y={36} k={10} />
            </g>
        ),
    },
    wheat: {
        bg: TT.terrain.field.base,
        scene: (
            <g>
                {[0, 1, 2, 3].map(i => (
                    <path
                        key={i}
                        d={`M 10 ${24 + i * 15} q 19 ${i % 2 ? 5 : -5} 38 0 t 38 0`}
                        stroke={i % 2 ? TT.terrain.field.furrowDark : TT.terrain.field.furrowLight}
                        strokeWidth={6}
                        fill="none"
                    />
                ))}
                {[-1, 0, 1].map(j => (
                    <g key={j}>
                        <line x1={48 + j * 7} y1={64} x2={48 + j * 9.5} y2={34} stroke={TT.terrain.field.stalk} strokeWidth={2.6} />
                        <ellipse
                            cx={48 + j * 9.5} cy={30} rx={3.4} ry={6}
                            fill={TT.terrain.field.furrowLight} stroke={TT.terrain.field.stalk} strokeWidth={1.2}
                            transform={`rotate(${j * 14} ${48 + j * 9.5} 30)`}
                        />
                    </g>
                ))}
            </g>
        ),
    },
    ore: {
        bg: TT.terrain.mountain.base,
        scene: (
            <g>
                <ellipse cx={48} cy={70} rx={36} ry={9} fill={TT.terrain.mountain.scree} opacity={0.6} />
                <Peak x={36} y={46} k={20} body={TT.terrain.mountain.peak} facet={TT.terrain.mountain.facetLight} />
                <Peak x={62} y={52} k={15} body={TT.terrain.mountain.peakDark} facet={TT.terrain.mountain.facetLight2} />
            </g>
        ),
    },
};

const COMMODITY_SCENES: Record<CommodityType, { bg: string; scene: React.ReactNode }> = {
    // paper is milled from forests
    paper: {
        bg: shade(TT.terrain.forest.base, 0.8),
        scene: (
            <g>
                <ellipse cx={48} cy={64} rx={30} ry={7} fill="#000" opacity={0.18} />
                {/* unrolled scroll */}
                <rect x={24} y={28} width={48} height={34} rx={2} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={1.2} />
                {[36, 43, 50, 57].map(y => (
                    <line key={y} x1={30} y1={y} x2={66} y2={y} stroke={TT.token.ringInner} strokeWidth={1.6} />
                ))}
                {/* rolled ends */}
                <rect x={20} y={26} width={7} height={38} rx={3.5} fill={shade(TT.token.face, 0.88)} stroke={TT.token.ring} strokeWidth={1.2} />
                <rect x={69} y={26} width={7} height={38} rx={3.5} fill={shade(TT.token.face, 0.88)} stroke={TT.token.ring} strokeWidth={1.2} />
            </g>
        ),
    },
    // cloth is woven from pastures
    cloth: {
        bg: shade(TT.terrain.pasture.base, 0.78),
        scene: (
            <g>
                <ellipse cx={48} cy={66} rx={30} ry={7} fill="#000" opacity={0.18} />
                {/* folded bolt of dyed cloth */}
                {[
                    { y: 52, fill: TT.barbarian.stripe },
                    { y: 42, fill: TT.token.face },
                    { y: 32, fill: TT.barbarian.stripe },
                ].map((b, i) => (
                    <g key={i}>
                        <path
                            d={`M 24 ${b.y} q 12 -5 24 0 t 24 0 v 9 q -12 5 -24 0 t -24 0 Z`}
                            fill={b.fill}
                            stroke={shade(b.fill === TT.token.face ? '#cfc0a0' : b.fill, 0.7)}
                            strokeWidth={1}
                        />
                        <path d={`M 24 ${b.y} q 12 -5 24 0 t 24 0`} stroke="#ffffff" strokeWidth={1.2} opacity={0.3} fill="none" />
                    </g>
                ))}
            </g>
        ),
    },
    // coin is minted from mountains
    coin: {
        bg: shade(TT.terrain.mountain.base, 0.75),
        scene: (
            <g>
                <ellipse cx={48} cy={66} rx={28} ry={7} fill="#000" opacity={0.2} />
                {[60, 53, 46].map((cy, i) => (
                    <g key={i}>
                        <ellipse cx={44} cy={cy} rx={16} ry={6.5} fill={shade('#e6c34c', 0.75)} />
                        <ellipse cx={44} cy={cy - 3} rx={16} ry={6.5} fill="#e6c34c" stroke={shade('#e6c34c', 0.6)} strokeWidth={1} />
                    </g>
                ))}
                {/* one coin standing on edge */}
                <ellipse cx={68} cy={48} rx={9} ry={11} fill="#e6c34c" stroke={shade('#e6c34c', 0.6)} strokeWidth={1.4} />
                <ellipse cx={68} cy={48} rx={5} ry={6.6} fill="none" stroke={shade('#e6c34c', 0.7)} strokeWidth={1.1} />
            </g>
        ),
    },
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
    wood: 'Wood', brick: 'Brick', sheep: 'Sheep', wheat: 'Wheat', ore: 'Ore',
};
const COMMODITY_NAMES: Record<CommodityType, string> = {
    paper: 'Paper', cloth: 'Cloth', coin: 'Coin',
};

/* ---------------- public faces ---------------- */

export const ResourceCardFace: React.FC<FaceProps & { type: ResourceType }> = ({ type, width = 96, className }) => {
    const s = RESOURCE_SCENES[type];
    return (
        <Frame windowFill={s.bg} name={RESOURCE_NAMES[type]} caption="RESOURCE" width={width} className={className}>
            {s.scene}
        </Frame>
    );
};

export const CommodityCardFace: React.FC<FaceProps & { type: CommodityType }> = ({ type, width = 96, className }) => {
    const s = COMMODITY_SCENES[type];
    return (
        <Frame windowFill={s.bg} name={COMMODITY_NAMES[type]} caption="COMMODITY" width={width} className={className}>
            {s.scene}
        </Frame>
    );
};

/* ---------------- card stack (HUD helper) ---------------- */

/**
 * A fanned mini-stack with a count badge — how hands and decks show quantity.
 * `children` is a card face rendered at the same `width`. Empty stacks gray out.
 */
export const CardStack: React.FC<{
    count: number;
    width?: number;
    className?: string;
    children: React.ReactNode;
}> = ({ count, width = 46, className, children }) => {
    const h = Math.round((width * CARD_H) / CARD_W);
    const empty = count <= 0;
    const layer: React.CSSProperties = {
        background: TT.token.face,
        border: `1px solid ${TT.token.ring}`,
        borderRadius: 4,
    };
    return (
        <div className={`relative ${className ?? ''}`} style={{ width, height: h }}>
            {count >= 3 && (
                <div className="absolute inset-0" style={{ ...layer, transform: 'rotate(5deg) translate(2px, 1px)' }} />
            )}
            {count >= 2 && (
                <div className="absolute inset-0" style={{ ...layer, transform: 'rotate(-3deg) translate(-1px, 1px)' }} />
            )}
            <div className="absolute inset-0" style={empty ? { filter: 'grayscale(0.9)', opacity: 0.45 } : undefined}>
                {children}
            </div>
            <div
                className="absolute flex items-center justify-center rounded-full font-bold tabular-nums"
                style={{
                    right: -6, bottom: -6, width: 20, height: 20,
                    background: empty ? '#59544c' : TT.token.ink,
                    color: TT.token.face, fontSize: 11,
                    border: `1.5px solid ${TT.token.face}`,
                }}
            >
                {count}
            </div>
        </div>
    );
};

/* ---------------- progress deck backs ---------------- */

const CATEGORY_LABEL: Record<ProgressCardCategory, string> = {
    science: 'Science', trade: 'Trade', politics: 'Politics',
};

const CATEGORY_EMBLEMS: Record<ProgressCardCategory, React.ReactNode> = {
    // alembic flask
    science: (
        <g>
            <path d="M 44 34 L 52 34 L 52 44 L 60 60 Q 62 66 56 66 L 40 66 Q 34 66 36 60 L 44 44 Z" fill="none" stroke={TT.token.face} strokeWidth={2.4} strokeLinejoin="round" />
            <path d="M 40.5 54 L 55.5 54 L 60 60 Q 62 66 56 66 L 40 66 Q 34 66 36 60 Z" fill={TT.token.face} opacity={0.85} />
            <line x1={41} y1={31} x2={55} y2={31} stroke={TT.token.face} strokeWidth={2.4} strokeLinecap="round" />
        </g>
    ),
    // balance scales
    trade: (
        <g stroke={TT.token.face} strokeWidth={2.2} strokeLinecap="round">
            <line x1={48} y1={30} x2={48} y2={62} />
            <line x1={32} y1={36} x2={64} y2={36} />
            <path d="M 26 50 A 7 7 0 0 0 40 50" fill={TT.token.face} opacity={0.85} />
            <line x1={33} y1={36} x2={28} y2={49} strokeWidth={1.4} />
            <line x1={33} y1={36} x2={38} y2={49} strokeWidth={1.4} />
            <path d="M 56 50 A 7 7 0 0 0 70 50" fill={TT.token.face} opacity={0.85} />
            <line x1={63} y1={36} x2={58} y2={49} strokeWidth={1.4} />
            <line x1={63} y1={36} x2={68} y2={49} strokeWidth={1.4} />
            <line x1={40} y1={64} x2={56} y2={64} />
        </g>
    ),
    // castle gate
    politics: (
        <g fill={TT.token.face} opacity={0.9}>
            <rect x={34} y={40} width={28} height={24} />
            {[34, 44.5, 55].map(x => (
                <rect key={x} x={x} y={33} width={7} height={9} />
            ))}
            <path d="M 43 64 L 43 54 A 5 5 0 0 1 53 54 L 53 64 Z" fill={shade(TT.category.politics, 0.75)} />
        </g>
    ),
};

export const ProgressDeckBack: React.FC<FaceProps & { category: ProgressCardCategory }> = ({ category, width = 96, className }) => {
    const color = TT.category[category];
    return (
        <svg
            viewBox={`0 0 ${CARD_W} ${CARD_H}`}
            width={width}
            height={Math.round((width * CARD_H) / CARD_W)}
            className={className}
            role="img"
            aria-label={`${CATEGORY_LABEL[category]} progress deck`}
        >
            <rect x={1} y={1} width={94} height={132} rx={7} fill={color} stroke={TT.token.ring} strokeWidth={2} />
            <rect x={5.5} y={5.5} width={85} height={123} rx={4.5} fill="none" stroke={TT.token.face} strokeWidth={1} opacity={0.55} />
            <rect x={10} y={10} width={76} height={114} rx={3} fill={shade(color, 1.12)} opacity={0.35} />
            <g transform="translate(0, -4)">{CATEGORY_EMBLEMS[category]}</g>
            <text x={48} y={104} textAnchor="middle" fontFamily={TT_SERIF} fontSize={13} fontWeight={700} fill={TT.token.face}>
                {CATEGORY_LABEL[category]}
            </text>
            <text x={48} y={118} textAnchor="middle" fontFamily={MONO} fontSize={6.5} letterSpacing={1.6} fill={TT.token.face} opacity={0.75}>
                PROGRESS
            </text>
        </svg>
    );
};

/* ---------------- progress card fronts ---------------- */

/**
 * Progress card face (user-approved design): category banner, icon window
 * tinted toward the category, fitted serif name. Rules text lives in the
 * tooltip/shelf, not on the face.
 */
export const ProgressCardFace: React.FC<FaceProps & { type: ProgressCardType }> = ({ type, width = 96, className }) => {
    const def = PROGRESS_CARD_DEFINITIONS[type];
    const color = TT.category[def.category];
    const Icon = PROGRESS_ICONS[type];
    return (
        <svg
            viewBox={`0 0 ${CARD_W} ${CARD_H}`}
            width={width}
            height={Math.round((width * CARD_H) / CARD_W)}
            className={className}
            role="img"
            aria-label={`${def.name} progress card`}
        >
            <rect x={1} y={1} width={94} height={132} rx={7} fill={TT.token.face} stroke={TT.token.ring} strokeWidth={2} />
            <rect x={5.5} y={5.5} width={85} height={123} rx={4.5} fill="none" stroke={TT.token.ringInner} strokeWidth={1} />
            <rect x={9} y={9} width={78} height={15} rx={3} fill={color} />
            <text x={48} y={19.5} textAnchor="middle" fontFamily={MONO} fontSize={7} letterSpacing={2.2} fontWeight={700} fill={TT.token.face}>
                {def.category.toUpperCase()}
            </text>
            <rect x={10} y={28} width={76} height={62} rx={3} fill={mix(TT.token.face, color, 0.13)} />
            <g transform="translate(48, 59)">
                <Icon />
            </g>
            <rect x={10} y={28} width={76} height={62} rx={3} fill="none" stroke={mix(TT.token.ring, color, 0.35)} strokeWidth={1.2} />
            {fitName(def.name, { base: 12.5, singleY: 106, twoYs: [102, 113], twoSize: 10.5 }).nodes}
            <text x={48} y={124} textAnchor="middle" fontFamily={MONO} fontSize={6} letterSpacing={1.4} fill={TT.token.ring}>
                PROGRESS
            </text>
        </svg>
    );
};

/* ---------------- development card faces (base game) ---------------- */

const DEV_META: Record<DevCardType, { name: string; tint: string }> = {
    knight: { name: 'Knight', tint: mix(TT.token.face, TT.barbarian.stripe, 0.16) },
    victory_point: { name: 'Victory Point', tint: mix(TT.token.face, TT.category.politics, 0.14) },
    road_building: { name: 'Road Building', tint: mix(TT.token.face, TT.terrain.hill.base, 0.14) },
    year_of_plenty: { name: 'Year of Plenty', tint: mix(TT.token.face, TT.terrain.forest.base, 0.14) },
    monopoly: { name: 'Monopoly', tint: mix(TT.token.face, TT.category.trade, 0.16) },
};

const DEV_SCENES: Record<DevCardType, React.ReactNode> = {
    // neutral crimson shield — deliberately no player's color
    knight: (
        <g>
            <ellipse cy={18} rx={14} ry={3} fill="#000" opacity={0.2} />
            <path d="M 0 -16 L 13 -11 L 13 1 Q 13 11 0 17 Q -13 11 -13 1 L -13 -11 Z" fill={TT.barbarian.stripe} />
            <path d="M 0 -16 L -13 -11 L -13 1 Q -13 11 0 17 Z" fill="#fff" opacity={0.12} />
            <path d="M 0 -16 L 13 -11 L 13 1 Q 13 11 0 17 Q -13 11 -13 1 L -13 -11 Z" fill="none" stroke={shade(TT.barbarian.stripe, 0.5)} strokeWidth={2} />
            <path d="M -6 -3 A 6 6 0 0 1 6 -3 L 6 1.5 L -6 1.5 Z" fill={TT.token.face} />
            <rect x={-4} y={-1.6} width={8} height={1.6} rx={0.8} fill={shade(TT.barbarian.stripe, 0.7)} />
        </g>
    ),
    victory_point: (
        <g>
            <ellipse cy={18} rx={14} ry={3} fill="#000" opacity={0.15} />
            <path d="M -14 12 C -20 2 -18 -10 -9 -15" fill="none" stroke={TT.highlight.primary} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M 14 12 C 20 2 18 -10 9 -15" fill="none" stroke={TT.highlight.primary} strokeWidth={2.4} strokeLinecap="round" />
            {([[-13, 6], [-15, -2], [-12, -10], [13, 6], [15, -2], [12, -10]] as [number, number][]).map(([x, y], i) => (
                <ellipse key={i} cx={x} cy={y} rx={3.2} ry={1.8} fill={TT.highlight.primary} transform={`rotate(${x < 0 ? -40 : 40} ${x} ${y})`} />
            ))}
            <polygon points="0,-9 2.4,-2.8 9,-2.8 3.6,1.4 5.6,8 0,4 -5.6,8 -3.6,1.4 -9,-2.8 -2.4,-2.8" fill={TT.highlight.primary} />
        </g>
    ),
    road_building: (
        <g>
            <ellipse cy={16} rx={17} ry={3.2} fill="#000" opacity={0.15} />
            {[-28, 28].map((deg, i) => (
                <g key={i} transform={`rotate(${deg})`}>
                    <rect x={-4.5} y={-15} width={9} height={30} rx={3.5}
                        fill={i ? shade(TT.terrain.forest.trunk, 1.25) : TT.terrain.forest.trunk}
                        stroke={shade(TT.terrain.forest.trunk, 0.55)} strokeWidth={1.4} />
                    <rect x={-3.1} y={-13} width={2.4} height={26} rx={1.2} fill="#fff" opacity={0.25} />
                </g>
            ))}
        </g>
    ),
    year_of_plenty: (
        <g>
            <ellipse cy={17} rx={17} ry={3.2} fill="#000" opacity={0.15} />
            <ellipse cx={-6} cy={6} rx={9} ry={6} fill={TT.terrain.field.furrowLight} stroke={TT.terrain.field.stalk} strokeWidth={1.2} />
            {[-10, -6, -2].map(x => (
                <circle key={x} cx={x} cy={3} r={2.2} fill={TT.terrain.field.base} stroke={TT.terrain.field.stalk} strokeWidth={0.8} />
            ))}
            {[[6, 8], [11.5, 8], [8.75, 4.2]].map(([x, y], i) => (
                <rect key={i} x={x - 2.75} y={y - 1.7} width={5.5} height={3.4} rx={0.5}
                    fill={i === 2 ? TT.terrain.hill.brick : TT.terrain.hill.brickDark}
                    stroke={TT.terrain.hill.mortar} strokeWidth={0.6} />
            ))}
            <path d="M -18 -8 Q 0 -18 18 -8" fill="none" stroke={TT.highlight.primary} strokeWidth={2.2} strokeLinecap="round" />
        </g>
    ),
    monopoly: (
        <g>
            <ellipse cy={17} rx={16} ry={3.2} fill="#000" opacity={0.15} />
            {([[-9, 8], [0, 10], [9, 8]] as [number, number][]).map(([x, y], i) => (
                <ellipse key={i} cx={x} cy={y} rx={6} ry={4.6} fill="#e6c34c" stroke={shade('#e6c34c', 0.6)} strokeWidth={1} />
            ))}
            <polygon points="-11,-2 -7.5,-9 -3.5,-3.5 0,-10.5 3.5,-3.5 7.5,-9 11,-2 11,2 -11,2" fill={TT.highlight.primary} />
            <rect x={-11} y={2} width={22} height={3} rx={1.2} fill={shade(TT.highlight.primary, 0.75)} />
        </g>
    ),
};

export const DevCardFace: React.FC<FaceProps & { type: DevCardType }> = ({ type, width = 96, className }) => {
    const meta = DEV_META[type];
    return (
        <Frame windowFill={meta.tint} name={meta.name} caption="DEVELOPMENT" width={width} className={className}>
            {/* dev scenes are authored around (0,0) — centered in the art window */}
            <g transform="translate(48, 45)">{DEV_SCENES[type]}</g>
        </Frame>
    );
};
