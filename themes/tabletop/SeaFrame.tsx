import React from 'react';
import { TT, r2 } from './palette';

/**
 * Sea frame — the water the island sits in. Rendered first inside the board
 * SVG so everything else draws over it. The page container behind the SVG is
 * painted the same TT.sea, so panning past the viewBox stays seamless.
 *
 * Wave positions are deterministic (fixed rings + index-based phase), never
 * random — SSR/CSR must emit identical markup (§2.3).
 */

/** Expanded viewBox that fits the sea frame + barbarian route (Phase 1.1) */
export const BOARD_VIEWBOX = '-580 -560 1160 1120';

const WAVE_RINGS: { radius: number; count: number; phase: number }[] = [
    { radius: 432, count: 14, phase: 0 },
    { radius: 505, count: 11, phase: 13 },
];

function wavePositions(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (const ring of WAVE_RINGS) {
        for (let i = 0; i < ring.count; i++) {
            const deg = ring.phase + (360 / ring.count) * i;
            const rad = (Math.PI / 180) * deg;
            out.push({
                x: r2(ring.radius * Math.cos(rad)),
                // slight vertical squash keeps waves inside the shorter viewBox axis
                y: r2(ring.radius * Math.sin(rad) * 0.9),
            });
        }
    }
    return out;
}

const WAVES = wavePositions();

export const SeaFrame: React.FC = () => (
    <g pointerEvents="none">
        {/* soft grounding shadow under the whole island */}
        <ellipse cy={22} rx={430} ry={398} fill="#000000" opacity={0.06} />
        {WAVES.map((w, i) => (
            <path
                key={i}
                d={`M ${r2(w.x - 12)} ${w.y} q 6 -5 12 0 t 12 0`}
                stroke={TT.wave}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                opacity={0.28}
            />
        ))}
    </g>
);
