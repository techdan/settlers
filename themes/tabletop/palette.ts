/**
 * Tabletop theme palette — the single color source for all tabletop art.
 * Values match the approved art-direction vignette (docs/archive/graphics-overhaul-plan-v2.1.md §2.1).
 *
 * Archived art rule (§2.2): outlines are always a darkened version of the shape's own fill
 * (use shade()), never black or white.
 */

export const TT = {
    sea: '#2f6472',
    wave: '#bfe0e6',
    /** Cardboard gap between tiles and tile outer edge */
    seam: '#e8dcc0',

    terrain: {
        forest: {
            base: '#3a7a48',
            under: '#468a54',
            canopyDark: '#1e5230',
            canopy: '#276a3d',
            canopyLight: '#348a4f',
            trunk: '#5b3a22',
        },
        hill: {
            base: '#c06a38',
            ground: '#cf7a45',
            brick: '#b65d33',
            brickDark: '#a8502a',
            mortar: '#7e3a1d',
        },
        pasture: {
            base: '#96c161',
            patchLight: '#a5cf72',
            patchDark: '#88b455',
            wool: '#f4f1e4',
            woolStroke: '#c9c3ac',
            face: '#3d3630',
        },
        field: {
            base: '#e3ab3f',
            furrowDark: '#c8922f',
            furrowLight: '#f0c25c',
            stalk: '#8a6420',
        },
        mountain: {
            base: '#93897a',
            scree: '#a49a89',
            peakDark: '#615a50',
            peak: '#6e675c',
            peakMid: '#78705f',
            facetLight: '#877f70',
            facetLight2: '#8d8574',
            snow: '#f2efe6',
        },
        desert: {
            base: '#e0c186',
            dune: '#c5a262',
            sun: '#f2d98b',
        },
    },

    token: {
        face: '#f3e9cf',
        ring: '#a98d55',
        ringInner: '#c9b381',
        ink: '#3a3020',
        red: '#b3352c',
    },

    barbarian: {
        hull: '#6b4a2c',
        sail: '#ddd5c2',
        stripe: '#b3432f',
        accent: '#b8433c',
    },

    robber: {
        body: '#4a4440',
        bodyLight: '#5d5650',
        base: '#332f2b',
    },

    merchant: {
        body: '#e9dcc0',
        bodyShade: '#cdbd9a',
        hat: '#8a6420',
    },

    /** Selection / highlight states (§2, redesigned to fit the art) */
    highlight: {
        valid: '#e8dcc0',      // cream ring — valid placement
        primary: '#c9973f',    // brass — primary board selection (e.g. Inventor first hex)
        secondary: '#4fa3ae',  // sea teal — secondary board selection
    },

    port: {
        pier: '#7c5a38',
        plank: '#9a7550',
        generic: '#c9973f',    // brass pennant for 3:1 ports
    },

    /** Barbarian sea route (§5) */
    route: {
        wake: '#1f4a56',
        stepFuture: '#1c4553',
        stepPassed: '#3d7484',
        stepStroke: '#5b8fa0',
        chipInk: '#12333f',
        chipStroke: '#3f6b7a',
    },

    /** Semantic status tints readable on the dark sea */
    status: {
        good: '#8fce9d',
        bad: '#e2a09a',
        neutral: '#cfd9d2',
    },

    /** C&K progress-card categories (deck backs, card banners, HUD accents) */
    category: {
        science: '#2e6b3e',
        trade: '#b98a2c',
        politics: '#34557e',
    },
} as const;

/** Serif stack for game-world text (tokens, card names) per §2.2 */
export const TT_SERIF =
    '"Palatino Linotype", "Iowan Old Style", "Book Antiqua", Palatino, Georgia, serif';

/**
 * Lighten (f > 1) or darken (f < 1) a #rrggbb color.
 * Used to derive facets and outlines from base fills so the palette stays small.
 */
export function shade(hexColor: string, f: number): string {
    const n = parseInt(hexColor.slice(1), 16);
    const ch = (v: number) => Math.min(255, Math.max(0, Math.round(v * f)));
    const r = ch((n >> 16) & 255);
    const g = ch((n >> 8) & 255);
    const b = ch(n & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Round to 2 decimals — all emitted SVG coordinates go through this (§2.3, hydration). */
export const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Blend two #rrggbb colors: t=0 → a, t=1 → b. Used for category-tinted card windows. */
export function mix(a: string, b: string, t: number): string {
    const A = parseInt(a.slice(1), 16);
    const B = parseInt(b.slice(1), 16);
    const ch = (sh: number) => Math.round(((A >> sh) & 255) * (1 - t) + ((B >> sh) & 255) * t);
    return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** Points string for a pointy-topped hexagon of radius `size` centered at (0,0). */
export function hexPointsStr(size: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        pts.push(`${r2(size * Math.cos(a))},${r2(size * Math.sin(a))}`);
    }
    return pts.join(' ');
}
