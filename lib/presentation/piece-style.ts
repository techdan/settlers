import { PLAYER_COLOR_NORMALIZATION_MAP } from '@/lib/constants/player-colors';

/** Shared miniature paint, separate from terrain and from legal-target colors. */
const PLAYER_PIECE_PAINT: Record<string, string> = {
    '#ff0000': '#c84e3c',
    '#0000ff': '#3279c1',
    '#ff7a00': '#ee8a18',
    '#d4b483': '#fff4d7',
};

/** Preserve owner identity, including historical colors in saved games. */
export function playerPieceColor(color: string): string {
    const key = color.trim().toLowerCase();
    return PLAYER_PIECE_PAINT[PLAYER_COLOR_NORMALIZATION_MAP[key] ?? key] ?? color;
}
