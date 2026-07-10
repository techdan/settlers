import React, { useMemo } from 'react';
import { Port as PortData } from '@/lib/types/board';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { ShieldGlyph, TowerGlyph, CrossedSwords } from './glyphs';
import { TT, shade, r2 } from './palette';

/**
 * Barbarian sea route (docs/graphics-overhaul-plan.md §5) — the drakkar sails
 * an 8-step Bézier through the western sea toward a landfall marker off the
 * coast. Replaces the HUD BarbarianTrack panel; the full text summary lives in
 * this group's <title> tooltip.
 *
 * Spec deviation, deliberate: the ship stays upright instead of rotating to
 * the curve tangent — the route runs steeply north–south, and a tangent-
 * rotated boat reads as capsized. Ships on maps sit level.
 */

interface BarbarianRouteProps {
    barbarianPosition: number;
    totalKnightStrength: number;
    totalCityCount: number;
    skipFirstBarbarianAttack?: boolean;
    hasBarbariansAttacked?: boolean;
    /** True while the barbarians are resolving an attack (city selection phase) */
    isUnderAttack?: boolean;
    /** Generated ports — steps are pushed seaward if they crowd a port sign */
    ports: PortData[];
}

// Route endpoints/control in board coordinates (viewBox -580..580 × -560..560).
// Open sea NW → landfall off the west coast, bowed away from the island.
const P0 = { x: -455, y: -345 };
const CTRL = { x: -575, y: -135 };
const P2 = { x: -430, y: 75 };

const PORT_CLEARANCE = 45;

function bezier(t: number): { x: number; y: number } {
    const u = 1 - t;
    return {
        x: u * u * P0.x + 2 * u * t * CTRL.x + t * t * P2.x,
        y: u * u * P0.y + 2 * u * t * CTRL.y + t * t * P2.y,
    };
}

export const BarbarianRoute: React.FC<BarbarianRouteProps> = ({
    barbarianPosition,
    totalKnightStrength,
    totalCityCount,
    skipFirstBarbarianAttack,
    hasBarbariansAttacked,
    isUnderAttack,
    ports,
}) => {
    const attackThreshold = CK_CONSTANTS.BARBARIAN_ATTACK_POSITION;

    const steps = useMemo(() => {
        const pts = Array.from({ length: attackThreshold + 1 }, (_, i) =>
            bezier(i / attackThreshold)
        );
        // Push any step that crowds a port sign further out to sea (away from origin)
        return pts.map(p => {
            let { x, y } = p;
            for (const port of ports) {
                const dx = x - port.position.x;
                const dy = y - port.position.y;
                const dist = Math.hypot(dx, dy);
                if (dist < PORT_CLEARANCE) {
                    const len = Math.hypot(x, y) || 1;
                    const push = PORT_CLEARANCE - dist + 6;
                    x += (x / len) * push;
                    y += (y / len) * push;
                }
            }
            return { x: r2(x), y: r2(y) };
        });
    }, [ports, attackThreshold]);

    const position = Math.min(Math.max(barbarianPosition, 0), attackThreshold);
    const atLandfall = position >= attackThreshold;
    const attacking = atLandfall || !!isUnderAttack;
    const firstAttackSkipped = !!skipFirstBarbarianAttack && !hasBarbariansAttacked && atLandfall;
    const defendersWinning = totalKnightStrength >= totalCityCount;
    const ship = steps[position];
    const landfall = steps[attackThreshold];

    const tooltip = [
        'Barbarian Route',
        `Position: ${position} / ${attackThreshold}`,
        attacking
            ? firstAttackSkipped
                ? 'First barbarian attack skipped'
                : 'Barbarians attack!'
            : `${attackThreshold - position} ship roll${attackThreshold - position === 1 ? '' : 's'} until landfall`,
        '',
        `Barbarian strength (cities): ${totalCityCount}`,
        `Active knights: ${totalKnightStrength}`,
        defendersWinning
            ? 'Catan is well defended.'
            : 'Defenders losing — if the barbarians land now, the weakest contributor loses a city.',
    ].join('\n');

    return (
        <g data-testid="barbarian-route">
            <title>{tooltip}</title>

            {/* wake */}
            <path
                d={`M ${P0.x} ${P0.y} Q ${CTRL.x} ${CTRL.y} ${P2.x} ${P2.y}`}
                fill="none"
                stroke={TT.route.wake}
                strokeWidth={2}
                strokeDasharray="3 6"
            />

            {/* steps */}
            {steps.map((s, i) => {
                const isLandfallStep = i === attackThreshold;
                const passed = i < position;
                if (isLandfallStep) {
                    return (
                        <g key={i} transform={`translate(${s.x}, ${s.y})`}>
                            <circle
                                r={10}
                                fill={TT.route.stepFuture}
                                stroke={TT.barbarian.accent}
                                strokeWidth={2}
                                className={attacking && !firstAttackSkipped ? 'animate-pulse' : undefined}
                            />
                            <CrossedSwords size={9} />
                        </g>
                    );
                }
                return (
                    <circle
                        key={i}
                        cx={s.x}
                        cy={s.y}
                        r={6}
                        fill={passed ? TT.route.stepPassed : TT.route.stepFuture}
                        stroke={TT.route.stepStroke}
                        strokeWidth={1.2}
                        opacity={passed ? 1 : 0.85}
                    />
                );
            })}

            {/* skip-first-attack badge over landfall */}
            {firstAttackSkipped && (
                <g transform={`translate(${landfall.x}, ${landfall.y - 20})`}>
                    <ShieldGlyph size={13} fill={TT.seam} />
                </g>
            )}

            {/* drakkar at the current step */}
            <g data-testid="barbarian-ship" transform={`translate(${ship.x}, ${ship.y - 4})`}>
                <ellipse cy={5} rx={15} ry={3} fill="#000000" opacity={0.25} />
                <path
                    d="M -15 0 C -8 8, 8 8, 15 0 L 11 -1.5 C 6 4, -6 4, -11 -1.5 Z"
                    fill={TT.barbarian.hull}
                    stroke={shade(TT.barbarian.hull, 0.6)}
                    strokeWidth={1}
                />
                <rect x={-1} y={-17} width={2} height={16} fill={shade(TT.barbarian.hull, 0.6)} />
                <rect x={-9} y={-16} width={18} height={10} rx={1} fill={TT.barbarian.sail} />
                <rect x={-9} y={-13.6} width={18} height={2.4} fill={TT.barbarian.stripe} />
                <rect x={-9} y={-9} width={18} height={2.4} fill={TT.barbarian.stripe} />
                {/* shields along the gunwale */}
                <circle cx={-8} cy={-0.5} r={2} fill={TT.highlight.primary} stroke={shade(TT.barbarian.hull, 0.6)} strokeWidth={0.6} />
                <circle cx={-1} cy={0.8} r={2} fill={TT.barbarian.accent} stroke={shade(TT.barbarian.hull, 0.6)} strokeWidth={0.6} />
                <circle cx={6} cy={0.8} r={2} fill={TT.highlight.primary} stroke={shade(TT.barbarian.hull, 0.6)} strokeWidth={0.6} />
            </g>

            {/* strength chips anchored seaward of landfall */}
            <g transform={`translate(${r2(landfall.x - 78)}, ${r2(landfall.y - 34)})`}>
                <rect width={62} height={20} rx={10} fill={TT.route.chipInk} stroke={TT.route.chipStroke} strokeWidth={1} />
                <g transform="translate(13, 10)">
                    <ShieldGlyph size={11} fill={defendersWinning ? TT.status.good : TT.status.neutral} />
                </g>
                <text
                    x={38}
                    y={14.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="'Segoe UI', system-ui, sans-serif"
                    fill={defendersWinning ? TT.status.good : TT.status.bad}
                >
                    {totalKnightStrength}
                </text>
            </g>
            <g transform={`translate(${r2(landfall.x - 78)}, ${r2(landfall.y - 8)})`}>
                <rect width={62} height={20} rx={10} fill={TT.route.chipInk} stroke={TT.route.chipStroke} strokeWidth={1} />
                <g transform="translate(13, 10)">
                    <TowerGlyph size={11} fill={TT.status.bad} />
                </g>
                <text
                    x={38}
                    y={14.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="'Segoe UI', system-ui, sans-serif"
                    fill={TT.status.neutral}
                >
                    {totalCityCount}
                </text>
            </g>
        </g>
    );
};
