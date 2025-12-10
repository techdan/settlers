import { PlayerColor } from '@/lib/types/player';

export const PLAYER_COLOR_VAR_MAP: Record<PlayerColor, string> = {
    '#ff0000': 'var(--color-player-1)',
    '#0000ff': 'var(--color-player-2)',
    '#d4b483': 'var(--color-player-3)',
    '#ff7a00': 'var(--color-player-4)',
};

export const PLAYER_COLOR_NORMALIZATION_MAP: Record<string, PlayerColor> = {
    '#ff0000': '#ff0000',
    '#0000ff': '#0000ff',
    '#ff7a00': '#ff7a00',
    '#ff9100': '#ff7a00', // Legacy brighter orange maps forward
    '#ffa500': '#ff7a00', // Older orange maps forward
    '#d4b483': '#d4b483',
    red: '#ff0000',
    blue: '#0000ff',
    orange: '#ff7a00',
    white: '#d4b483',
    beige: '#d4b483',
};

export const DEFAULT_PLAYER_COLOR: PlayerColor = '#ff0000';

export const PLAYER_COLOR_OPTIONS: { value: PlayerColor; label: string; swatch: string }[] = [
    { value: '#ff0000', label: 'Red', swatch: PLAYER_COLOR_VAR_MAP['#ff0000'] },
    { value: '#0000ff', label: 'Blue', swatch: PLAYER_COLOR_VAR_MAP['#0000ff'] },
    { value: '#d4b483', label: 'Beige', swatch: PLAYER_COLOR_VAR_MAP['#d4b483'] },
    { value: '#ff7a00', label: 'Orange', swatch: PLAYER_COLOR_VAR_MAP['#ff7a00'] },
];
