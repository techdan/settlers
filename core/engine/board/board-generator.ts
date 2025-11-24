import { createHex, Hex } from '@/lib/hex';

export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert';

export interface HexTileData {
    hex: Hex;
    resource: ResourceType;
    numberToken: number | null;
    id: string;
}

/**
 * Fixed layout for standard Catan board
 * This is a deterministic permutation following classic Catan setup
 */
const TILE_LAYOUT = [
    { q: 0, r: -2, res: 'ore', num: 10 },
    { q: 1, r: -2, res: 'sheep', num: 2 },
    { q: 2, r: -2, res: 'wood', num: 9 },
    { q: -1, r: -1, res: 'wheat', num: 12 },
    { q: 0, r: -1, res: 'brick', num: 6 },
    { q: 1, r: -1, res: 'sheep', num: 4 },
    { q: 2, r: -1, res: 'brick', num: 10 },
    { q: -2, r: 0, res: 'wheat', num: 9 },
    { q: -1, r: 0, res: 'wood', num: 11 },
    { q: 0, r: 0, res: 'desert', num: null },
    { q: 1, r: 0, res: 'wood', num: 3 },
    { q: 2, r: 0, res: 'ore', num: 8 },
    { q: -2, r: 1, res: 'wood', num: 8 },
    { q: -1, r: 1, res: 'ore', num: 3 },
    { q: 0, r: 1, res: 'wheat', num: 4 },
    { q: 1, r: 1, res: 'sheep', num: 5 },
    { q: -2, r: 2, res: 'brick', num: 5 },
    { q: -1, r: 2, res: 'wheat', num: 6 },
    { q: 0, r: 2, res: 'sheep', num: 11 },
] as const;

/**
 * Generate a standard Catan board with fixed layout
 * 
 * @returns Array of hex tiles with resources and number tokens
 */
export function generateStandardBoard(): HexTileData[] {
    return TILE_LAYOUT.map(t => ({
        hex: createHex(t.q, t.r),
        resource: t.res as ResourceType,
        numberToken: t.num,
        id: `${t.q},${t.r}`
    }));
}

/**
 * Get the desert hex ID (where robber starts)
 */
export function getDesertHexId(): string {
    const desertTile = TILE_LAYOUT.find(t => t.res === 'desert');
    return desertTile ? `${desertTile.q},${desertTile.r}` : '0,0';
}
