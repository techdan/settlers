import type { TerrainType } from '@/core/rules/board-constants';
import type { PortType } from '@/lib/types/board';
import type { EventDieFace } from '@/core/rules/commodity-constants';

/**
 * Single typed source of truth for hardcoded board/dice colors.
 *
 * These are literal hex values (not `var(--color-*)` references) so that
 * flat-theme board rendering stays pixel-identical to what shipped before
 * this module existed - some of these values have drifted from the
 * similarly-named CSS custom properties in `app/globals.css` (see the
 * `forest` note below); reconciling that drift is a separate, deliberate
 * design decision left for the graphics overhaul, not a mechanical rename.
 */

/** Hex tile fill per terrain (flat theme). */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
    // NOTE: drifted from `--color-hex-forest` (#006636) in app/globals.css.
    // Kept as-is here to preserve current on-board rendering; reconcile deliberately, not mechanically.
    forest: '#06740E',   // Forest green (wood)
    hill: '#ca7728',     // Hills orange-brown (brick)
    pasture: '#84b83f',  // Pasture green (sheep)
    field: '#f9e26f',    // Fields yellow (wheat)
    mountain: '#666d63', // Mountain grey (ore)
    desert: '#e4c27c',   // Desert tan
};

/** Hex tile outline colors (flat theme). */
export const HEX_TILE_STROKE = {
    default: '#e5e7eb',
    selectable: '#4ade80',
} as const;

/** Port icon-circle background per port type; mirrors the matching terrain color. */
export const PORT_COLORS: Record<PortType, string> = {
    wood: TERRAIN_COLORS.forest,
    brick: TERRAIN_COLORS.hill,
    sheep: TERRAIN_COLORS.pasture,
    wheat: TERRAIN_COLORS.field,
    ore: TERRAIN_COLORS.mountain,
    generic: '#FFFFFF',
};

/** Shared "ink"/neutral colors used across port and number-token chrome. */
export const BOARD_UI_COLORS = {
    outline: '#333333',
    tokenFace: '#F5F5DC',
    textDark: '#000000',
    textRed: '#D00',
} as const;

/** Selection-highlight ring colors for the number token (Inventor's primary/secondary picks). */
export const NUMBER_TOKEN_HIGHLIGHT = {
    primary: '#22c55e',
    secondary: '#22d3ee',
} as const;

/** Dice face colors (base game red/yellow dice + Cities & Knights event die). */
export const DICE_COLORS = {
    redDie: '#dc2626',
    yellowDie: '#fbbf24',
    eventDieFace: '#ffffff',
} as const;

/** Event die icon tint per rolled face. */
export const EVENT_DIE_ICON_COLORS: Record<EventDieFace, string> = {
    ship: '#0f172a',
    science: '#6bb97f',
    trade: '#c6daa4',
    politics: '#d7dfd1',
};
