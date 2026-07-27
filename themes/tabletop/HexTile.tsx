import React from 'react';
import { Hex, hexToPixel } from '@/lib/hex';
import { TerrainType } from '@/core/rules/board-constants';
import { NumberToken } from './NumberToken';
import { Robber } from './Robber';
import { Merchant } from './Merchant';
import { TT, shade, r2, hexPointsStr } from './palette';
import { StatusGlyph } from './glyphs';

/**
 * Tabletop hex tile — each terrain is a small illustrated scene on warm tile
 * stock with a cream cardboard seam (docs/archive/graphics-overhaul-plan-v2.1.md §2).
 *
 * Drop-in replacement for themes/flat/HexTile: identical props contract.
 * Art rules: one sun top-left; outlines are darkened own-fill; one ellipse
 * shadow per grounded object; features live in the upper ⅔ so nothing
 * competes with the number token; all coordinates are fractions of `size`
 * rounded to 2 decimals.
 */

interface HexTileProps {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    hasRobber: boolean;
    hasMerchant?: boolean;
    merchantColor?: string;
    size: number;
    onClick?: () => void;
    isRolled?: boolean;
    isSelectable?: boolean;
    selectionVariant?: 'glow' | 'cursor';
    selectionState?: 'primary' | 'secondary' | null;
    isPendingRobberPlacement?: boolean;
    onConfirmPlacement?: () => void;
    onCancelPlacement?: () => void;
}

const BASE: Record<TerrainType, string> = {
    forest: TT.terrain.forest.base,
    hill: TT.terrain.hill.base,
    pasture: TT.terrain.pasture.base,
    field: TT.terrain.field.base,
    mountain: TT.terrain.mountain.base,
    desert: TT.terrain.desert.base,
};

/* ---------------- terrain feature helpers ---------------- */

const pts = (list: [number, number][]) => list.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ');

const Tree: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.forest;
    return (
        <g>
            <ellipse cx={r2(x)} cy={r2(y + k * 1.15)} rx={r2(k * 0.9)} ry={r2(k * 0.28)} fill="#000000" opacity={0.18} />
            <rect x={r2(x - k * 0.12)} y={r2(y + k * 0.55)} width={r2(k * 0.24)} height={r2(k * 0.55)} fill={c.trunk} />
            <polygon points={pts([[x - k * 0.75, y + k * 0.7], [x + k * 0.75, y + k * 0.7], [x, y - k * 0.35]])} fill={c.canopyDark} />
            <polygon points={pts([[x - k * 0.55, y + k * 0.05], [x + k * 0.55, y + k * 0.05], [x, y - k]])} fill={c.canopy} />
            <polygon points={pts([[x - k * 0.55, y + k * 0.05], [x, y - k], [x, y + k * 0.05]])} fill={c.canopyLight} opacity={0.7} />
        </g>
    );
};

const Peak: React.FC<{ x: number; y: number; k: number; body: string; facet: string }> = ({ x, y, k, body, facet }) => (
    <g>
        <polygon points={pts([[x - k, y + k * 0.75], [x + k, y + k * 0.75], [x, y - k]])} fill={body} />
        <polygon points={pts([[x - k, y + k * 0.75], [x, y - k], [x, y + k * 0.75]])} fill={facet} />
        <polygon
            points={pts([[x - k * 0.28, y - k * 0.44], [x + k * 0.28, y - k * 0.44], [x + k * 0.16, y - k * 0.68], [x, y - k], [x - k * 0.13, y - k * 0.6]])}
            fill={TT.terrain.mountain.snow}
        />
    </g>
);

const Sheep: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.pasture;
    return (
        <g>
            <ellipse cx={r2(x)} cy={r2(y + k * 0.5)} rx={r2(k * 0.75)} ry={r2(k * 0.18)} fill="#000000" opacity={0.15} />
            <ellipse cx={r2(x)} cy={r2(y)} rx={r2(k * 0.7)} ry={r2(k * 0.45)} fill={c.wool} stroke={c.woolStroke} strokeWidth={r2(k * 0.06)} />
            <circle cx={r2(x + k * 0.62)} cy={r2(y - k * 0.18)} r={r2(k * 0.22)} fill={c.face} />
        </g>
    );
};

const BrickStack: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
    const c = TT.terrain.hill;
    const bricks: React.ReactNode[] = [];
    for (let row = 0; row < 3; row++) {
        const n = 3 - row;
        for (let col = 0; col < n; col++) {
            bricks.push(
                <rect
                    key={`${row}-${col}`}
                    x={r2(x - (n * k * 0.55) / 2 + col * k * 0.55)}
                    y={r2(y - row * k * 0.34)}
                    width={r2(k * 0.5)}
                    height={r2(k * 0.28)}
                    rx={r2(k * 0.04)}
                    fill={row % 2 ? c.brickDark : c.brick}
                    stroke={c.mortar}
                    strokeWidth={r2(k * 0.045)}
                />
            );
        }
    }
    return <g>{bricks}</g>;
};

/* ---------------- terrain scenes (features fill upper ⅔, token owns the lower center) ---------------- */

const ForestScene: React.FC<{ s: number }> = ({ s }) => (
    <g>
        <polygon points={hexPointsStr(s)} transform={`translate(0, ${r2(s * 0.55)})`} fill={TT.terrain.forest.under} opacity={0.5} />
        {([[-0.42, -0.1], [0.02, -0.42], [0.45, -0.12], [-0.2, 0.28], [0.25, 0.3]] as [number, number][]).map(([ox, oy], i) => (
            <Tree key={i} x={ox * s} y={oy * s} k={s * 0.26} />
        ))}
    </g>
);

const FieldScene: React.FC<{ s: number }> = ({ s }) => {
    const c = TT.terrain.field;
    const amp = r2(s * 0.115);
    return (
        <g>
            {[-2, -1, 0, 1, 2].map(i => (
                <path
                    key={i}
                    d={`M ${r2(-s)} ${r2(i * s * 0.26)} q ${r2(s * 0.5)} ${i % 2 ? amp : -amp} ${r2(2 * s)} 0`}
                    stroke={i % 2 ? c.furrowDark : c.furrowLight}
                    strokeWidth={r2(s * 0.11)}
                    fill="none"
                />
            ))}
            {([[-0.3, -0.15], [0.32, 0.05]] as [number, number][]).map(([ox, oy], ci) => {
                const x = ox * s, y = oy * s, k = s / 52;
                return (
                    <g key={ci}>
                        {[-1, 0, 1].map(j => (
                            <g key={j}>
                                <line
                                    x1={r2(x + j * 4 * k)} y1={r2(y + 8 * k)}
                                    x2={r2(x + j * 5.5 * k)} y2={r2(y - 7 * k)}
                                    stroke={c.stalk} strokeWidth={r2(1.6 * k)}
                                />
                                <circle cx={r2(x + j * 5.5 * k)} cy={r2(y - 7 * k)} r={r2(2.1 * k)} fill={c.stalk} />
                            </g>
                        ))}
                    </g>
                );
            })}
        </g>
    );
};

const MountainScene: React.FC<{ s: number }> = ({ s }) => {
    const c = TT.terrain.mountain;
    return (
        <g>
            <polygon points={hexPointsStr(s)} transform={`translate(0, ${r2(s * 0.6)})`} fill={c.scree} opacity={0.6} />
            <Peak x={-0.3 * s} y={-0.05 * s} k={0.42 * s} body={c.peak} facet={c.facetLight} />
            <Peak x={0.32 * s} y={0.02 * s} k={0.34 * s} body={c.peakDark} facet={c.facetLight2} />
            <Peak x={0.02 * s} y={0.3 * s} k={0.26 * s} body={c.peakMid} facet={c.facetLight2} />
        </g>
    );
};

const PastureScene: React.FC<{ s: number }> = ({ s }) => {
    const c = TT.terrain.pasture;
    return (
        <g>
            <ellipse cx={r2(-0.3 * s)} cy={r2(-0.25 * s)} rx={r2(0.45 * s)} ry={r2(0.28 * s)} fill={c.patchLight} opacity={0.8} />
            <ellipse cx={r2(0.35 * s)} cy={r2(0.3 * s)} rx={r2(0.5 * s)} ry={r2(0.3 * s)} fill={c.patchDark} opacity={0.7} />
            <Sheep x={-0.22 * s} y={0.05 * s} k={s * 0.234} />
            <Sheep x={0.32 * s} y={-0.28 * s} k={s * 0.182} />
        </g>
    );
};

const HillScene: React.FC<{ s: number }> = ({ s }) => (
    <g>
        <ellipse cy={r2(0.45 * s)} rx={r2(0.9 * s)} ry={r2(0.4 * s)} fill={TT.terrain.hill.ground} opacity={0.7} />
        <BrickStack x={-0.28 * s} y={0.05 * s} k={s * 0.26} />
        <BrickStack x={0.34 * s} y={-0.22 * s} k={s * 0.208} />
    </g>
);

const DesertScene: React.FC<{ s: number }> = ({ s }) => {
    const c = TT.terrain.desert;
    return (
        <g>
            {([[-0.35, 0.05, 0.5], [0.15, -0.25, 0.42], [0.3, 0.35, 0.55]] as [number, number, number][]).map(([ox, oy, w], i) => (
                <path
                    key={i}
                    d={`M ${r2((ox - w) * s)} ${r2(oy * s)} q ${r2(w * s)} ${r2(-0.36 * s)} ${r2(2 * w * s)} 0`}
                    stroke={c.dune}
                    strokeWidth={r2(s * 0.07)}
                    fill="none"
                />
            ))}
            <circle cx={r2(0.45 * s)} cy={r2(-0.45 * s)} r={r2(0.14 * s)} fill={c.sun} />
        </g>
    );
};

const SCENES: Record<TerrainType, React.FC<{ s: number }>> = {
    forest: ForestScene,
    field: FieldScene,
    mountain: MountainScene,
    pasture: PastureScene,
    hill: HillScene,
    desert: DesertScene,
};

/* ---------------- tile ---------------- */

export const HexTile: React.FC<HexTileProps> = ({
    hex,
    terrain,
    numberToken,
    hasRobber,
    hasMerchant,
    merchantColor,
    size,
    onClick,
    isRolled,
    isSelectable,
    selectionVariant = 'glow',
    selectionState = null,
    isPendingRobberPlacement = false,
    onConfirmPlacement,
    onCancelPlacement,
}) => {
    const { x, y } = hexToPixel(hex, size);
    const base = BASE[terrain];
    const Scene = SCENES[terrain];
    const shouldGlow = !!isSelectable && selectionVariant === 'glow';
    const clipId = `tt-clip-${hex.q}_${hex.r}`;
    const tokenRadius = Math.max(12, Math.round(size * 0.28));

    return (
        <g
            transform={`translate(${r2(x)}, ${r2(y)})`}
            data-terrain={terrain}
            data-hex-id={`${hex.q},${hex.r}`}
            onClick={isSelectable ? onClick : undefined}
            className={isSelectable ? 'cursor-pointer' : ''}
        >
            {/* cardboard seam under the tile */}
            <polygon points={hexPointsStr(size + 1.5)} fill={TT.seam} />

            <defs>
                <clipPath id={clipId}>
                    <polygon points={hexPointsStr(size - 1.5)} />
                </clipPath>
            </defs>

            {/* illustrated tile face */}
            <g
                clipPath={`url(#${clipId})`}
                className={`transition-all ${isSelectable ? 'hover:brightness-110' : ''} ${isRolled ? 'animate-flash' : ''}`}
            >
                <polygon points={hexPointsStr(size)} fill={base} />
                <Scene s={size} />
            </g>

            {/* inner edge: darkened own-fill, never black (§2.2) */}
            <polygon
                points={hexPointsStr(size - 1.5)}
                fill="none"
                stroke={shade(base, 0.72)}
                strokeWidth={2}
                pointerEvents="none"
            />

            {/* valid-placement glow: cream ring, fits the art instead of neon green */}
            {shouldGlow && (
                <polygon
                    points={hexPointsStr(size - 0.5)}
                    fill="none"
                    stroke={TT.highlight.valid}
                    strokeWidth={5}
                    className="animate-pulse"
                    pointerEvents="none"
                />
            )}

            {numberToken && (
                <g transform={`translate(0, ${r2(size * 0.3)})`}>
                    <NumberToken
                        number={numberToken}
                        highlight={selectionState ?? undefined}
                        radius={tokenRadius}
                    />
                </g>
            )}

            {hasRobber && (
                <g transform={hasMerchant ? 'translate(-12, 0)' : undefined}>
                    <Robber />
                </g>
            )}
            {hasMerchant && (
                <g transform={hasRobber ? 'translate(12, 0)' : undefined}>
                    <Merchant color={merchantColor} />
                </g>
            )}

            {isPendingRobberPlacement && (
                <>
                    <g
                        transform="translate(24, -24)"
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label="Confirm robber placement"
                        onClick={(event) => {
                            event.stopPropagation();
                            onConfirmPlacement?.();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onConfirmPlacement?.();
                            }
                        }}
                    >
                        <circle r={10} fill="var(--color-highlight-success)" stroke="var(--color-highlight-white)" strokeWidth={2} />
                        <g transform="scale(0.78)" className="pointer-events-none"><StatusGlyph type="confirm" /></g>
                        <title>Confirm Placement</title>
                    </g>
                    <g
                        transform="translate(-24, -24)"
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label="Cancel robber placement"
                        onClick={(event) => {
                            event.stopPropagation();
                            onCancelPlacement?.();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onCancelPlacement?.();
                            }
                        }}
                    >
                        <circle r={10} fill="var(--color-highlight-danger)" stroke="var(--color-highlight-white)" strokeWidth={2} />
                        <g transform="scale(0.78)" className="pointer-events-none"><StatusGlyph type="cancel" /></g>
                        <title>Cancel Placement</title>
                    </g>
                </>
            )}
        </g>
    );
};
