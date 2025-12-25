import { createHex, Hex } from '@/lib/hex';
import {
    SPIRAL_COORDS,
    TERRAIN_COUNTS,
    SPIRAL_TOKEN_ORDER,
    TOKEN_PIPS,
    TerrainType,
    ResourceType,
    TERRAIN_TO_RESOURCE
} from '@/core/rules/board-constants';
import { randomInt } from 'crypto';

// Port definitions: hex coordinates and resource type
// Based on port-generator.ts COASTLINE_EDGES and PORT_INDICES
const PORT_HEX_RESOURCES: { q: number; r: number; resource: ResourceType | 'generic' }[] = [
    { q: -1, r: -1, resource: 'sheep' },   // sheep port
    { q: 1, r: -2, resource: 'generic' },  // generic port
    { q: 2, r: -2, resource: 'generic' },  // generic port
    { q: 2, r: -1, resource: 'brick' },    // brick port
    { q: 2, r: 0, resource: 'wood' },      // wood port
    { q: 0, r: 2, resource: 'generic' },   // generic port
    { q: -1, r: 2, resource: 'wheat' },    // wheat port
    { q: -2, r: 1, resource: 'ore' },      // ore port
    { q: -2, r: 0, resource: 'generic' },  // generic port
];

/**
 * Re-export types from constants for convenience
 */
export type { ResourceType, TerrainType } from '@/core/rules/board-constants';

/**
 * Tile types on the board (resources + desert)
 * @deprecated Use TerrainType instead
 */
export type TileType = ResourceType | 'desert';

export interface HexTileData {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    id: string;
    pips?: number;
}

export interface BoardGenerationOptions {
    fairMode: boolean;
}

/**
 * Fixed layout for standard Catan board (Legacy/Default)
 */
const STANDARD_LAYOUT = [
    { q: 0, r: -2, terrain: 'mountain', num: 10 },
    { q: 1, r: -2, terrain: 'pasture', num: 2 },
    { q: 2, r: -2, terrain: 'forest', num: 9 },
    { q: -1, r: -1, terrain: 'field', num: 12 },
    { q: 0, r: -1, terrain: 'hill', num: 6 },
    { q: 1, r: -1, terrain: 'pasture', num: 4 },
    { q: 2, r: -1, terrain: 'hill', num: 10 },
    { q: -2, r: 0, terrain: 'field', num: 9 },
    { q: -1, r: 0, terrain: 'forest', num: 11 },
    { q: 0, r: 0, terrain: 'desert', num: null },
    { q: 1, r: 0, terrain: 'forest', num: 3 },
    { q: 2, r: 0, terrain: 'mountain', num: 8 },
    { q: -2, r: 1, terrain: 'forest', num: 8 },
    { q: -1, r: 1, terrain: 'mountain', num: 3 },
    { q: 0, r: 1, terrain: 'field', num: 4 },
    { q: 1, r: 1, terrain: 'pasture', num: 5 },
    { q: -2, r: 2, terrain: 'hill', num: 5 },
    { q: -1, r: 2, terrain: 'field', num: 6 },
    { q: 0, r: 2, terrain: 'pasture', num: 11 },
] as const;

/**
 * Generate a standard Catan board with fixed layout
 */
export function generateStandardBoard(): HexTileData[] {
    return STANDARD_LAYOUT.map(t => ({
        hex: createHex(t.q, t.r),
        terrain: t.terrain as TerrainType,
        numberToken: t.num,
        id: `${t.q},${t.r}`,
        pips: t.num ? TOKEN_PIPS[t.num] : 0
    }));
}

/**
 * Get the desert hex ID (where robber starts)
 */
export function getDesertHexId(board: HexTileData[]): string {
    const desertTile = board.find(t => t.terrain === 'desert');
    return desertTile ? desertTile.id : '0,0';
}

/**
 * Generate a new board with the specified options
 */
export function generateBoard(options: BoardGenerationOptions): HexTileData[] {
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const board = tryGenerateBoard(options);
            return board;
        } catch (e) {
            // Retry if generation failed (e.g. fairness constraints)
            continue;
        }
    }

    // Fallback to standard board if generation fails repeatedly
    console.warn('Board generation failed after max attempts, falling back to standard board');
    return generateStandardBoard();
}

function tryGenerateBoard(options: BoardGenerationOptions): HexTileData[] {
    // 1. Shuffle Terrains
    const terrains = shuffleTerrains(options.fairMode);

    // 2. Assign Terrains to Spiral Coords
    const board: HexTileData[] = SPIRAL_COORDS.map((coord, index) => {
        const terrain = terrains[index];
        return {
            hex: createHex(coord.q, coord.r),
            terrain: terrain,
            numberToken: null,
            id: `${coord.q},${coord.r}`,
            pips: 0
        };
    });

    // 3. Place Tokens
    placeTokens(board);

    // 4. Enforce Adjacency Rules (6/8)
    enforceAdjacencyRules(board);

    // 5. Fairness Checks (if enabled)
    if (options.fairMode) {
        if (!checkFairness(board)) {
            throw new Error('Fairness check failed');
        }
    }

    return board;
}

function shuffleTerrains(fairMode: boolean): TerrainType[] {
    if (!fairMode) {
        // Simple random shuffle when fairness is disabled
        const terrains: TerrainType[] = [];
        Object.entries(TERRAIN_COUNTS).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
                terrains.push(type as TerrainType);
            }
        });
        for (let i = terrains.length - 1; i > 0; i--) {
            const j = randomInt(0, i + 1);
            [terrains[i], terrains[j]] = [terrains[j], terrains[i]];
        }
        return terrains;
    }

    // Fair mode: Place terrains to avoid clusters of 3+
    // Build terrain pool
    const pool: TerrainType[] = [];
    Object.entries(TERRAIN_COUNTS).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
            pool.push(type as TerrainType);
        }
    });

    // Shuffle the pool for randomness
    for (let i = pool.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Place terrains one by one, checking constraints
    const result: (TerrainType | null)[] = new Array(SPIRAL_COORDS.length).fill(null);

    for (let i = 0; i < SPIRAL_COORDS.length; i++) {
        const coord = SPIRAL_COORDS[i];

        // Find neighbors that are already placed
        const neighborIndices = getNeighborIndices(i);
        const placedNeighborTerrains = neighborIndices
            .filter(ni => ni < i && result[ni] !== null)
            .map(ni => result[ni]!);

        // Count same-terrain neighbors for each candidate
        const validCandidates = pool.filter(terrain => {
            const sameCount = placedNeighborTerrains.filter(t => t === terrain).length;
            // Allow this terrain only if it won't create a cluster with already-placed neighbors
            return sameCount < 2;
        });

        if (validCandidates.length === 0) {
            // No valid placement, fallback to random
            const idx = randomInt(0, pool.length);
            result[i] = pool[idx];
            pool.splice(idx, 1);
        } else {
            // Pick randomly from valid candidates
            const pick = validCandidates[randomInt(0, validCandidates.length)];
            result[i] = pick;
            pool.splice(pool.indexOf(pick), 1);
        }
    }

    return result as TerrainType[];
}

function getNeighborIndices(index: number): number[] {
    const coord = SPIRAL_COORDS[index];
    const neighborCoords = [
        { q: coord.q + 1, r: coord.r },
        { q: coord.q + 1, r: coord.r - 1 },
        { q: coord.q, r: coord.r - 1 },
        { q: coord.q - 1, r: coord.r },
        { q: coord.q - 1, r: coord.r + 1 },
        { q: coord.q, r: coord.r + 1 },
    ];

    return neighborCoords
        .map(nc => SPIRAL_COORDS.findIndex(c => c.q === nc.q && c.r === nc.r))
        .filter(i => i !== -1);
}

function placeTokens(board: HexTileData[]) {
    // Shuffle the token order for random placement
    const tokens = [...SPIRAL_TOKEN_ORDER];
    for (let i = tokens.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
    }

    let tokenIndex = 0;

    // Iterate through board in SPIRAL order (which matches SPIRAL_COORDS order)
    for (const tile of board) {
        if (tile.terrain === 'desert') {
            tile.numberToken = null;
            tile.pips = 0;
            continue;
        }

        if (tokenIndex < tokens.length) {
            const token = tokens[tokenIndex];
            tile.numberToken = token;
            tile.pips = TOKEN_PIPS[token];
            tokenIndex++;
        }
    }
}

function enforceAdjacencyRules(board: HexTileData[]) {
    // Rules: No 6 next to 8, No 6 next to 6, No 8 next to 8.
    // If violated, swap with low-weight tokens (2,3,11,12).

    let violations = getAdjacencyViolations(board);
    let attempts = 0;
    const maxSwaps = 100;

    while (violations.length > 0 && attempts < maxSwaps) {
        attempts++;
        const violation = violations[0]; // Take first violation

        // Try to swap one of the violating tiles with a low-weight token
        if (!swapToFixViolation(board, violation)) {
            // If can't swap easily, maybe just shuffle low tokens?
            // For now, continue and hope other swaps help, or we'll hit maxSwaps.
        }

        violations = getAdjacencyViolations(board);
    }

    if (violations.length > 0) {
        throw new Error('Could not resolve adjacency violations');
    }
}

function getAdjacencyViolations(board: HexTileData[]): { t1: HexTileData, t2: HexTileData }[] {
    const violations: { t1: HexTileData, t2: HexTileData }[] = [];

    for (const t1 of board) {
        if (!t1.numberToken) continue;

        const neighbors = getNeighbors(board, t1);
        for (const t2 of neighbors) {
            if (!t2.numberToken) continue;

            // Check 6/8 adjacency
            const isRed1 = t1.numberToken === 6 || t1.numberToken === 8;
            const isRed2 = t2.numberToken === 6 || t2.numberToken === 8;

            if (isRed1 && isRed2) {
                // Avoid duplicates
                if (!violations.some(v => (v.t1 === t1 && v.t2 === t2) || (v.t1 === t2 && v.t2 === t1))) {
                    violations.push({ t1, t2 });
                }
            }
        }
    }
    return violations;
}

function swapToFixViolation(board: HexTileData[], violation: { t1: HexTileData, t2: HexTileData }): boolean {
    // Try to swap t1 or t2 with a low-weight token (2,3,11,12)
    // that is NOT currently causing a violation and won't cause one here.

    const candidates = board.filter(t =>
        t.numberToken &&
        [2, 3, 11, 12].includes(t.numberToken) &&
        t !== violation.t1 && t !== violation.t2
    );

    // Shuffle candidates to avoid patterns
    candidates.sort(() => Math.random() - 0.5);

    for (const candidate of candidates) {
        // Try swapping t1 with candidate
        if (trySwap(board, violation.t1, candidate)) return true;

        // Try swapping t2 with candidate
        if (trySwap(board, violation.t2, candidate)) return true;
    }

    return false;
}

function trySwap(board: HexTileData[], target: HexTileData, candidate: HexTileData): boolean {
    // Temporarily swap
    const tempToken = target.numberToken;
    const tempPips = target.pips;
    target.numberToken = candidate.numberToken;
    target.pips = candidate.pips;
    candidate.numberToken = tempToken;
    candidate.pips = tempPips;

    // Check if this created new violations for target or candidate
    if (hasViolation(board, target) || hasViolation(board, candidate)) {
        // Revert
        candidate.numberToken = target.numberToken;
        candidate.pips = target.pips;
        target.numberToken = tempToken;
        target.pips = tempPips;
        return false;
    }

    return true;
}

function hasViolation(board: HexTileData[], tile: HexTileData): boolean {
    if (!tile.numberToken) return false;
    const isRed = tile.numberToken === 6 || tile.numberToken === 8;
    if (!isRed) return false;

    const neighbors = getNeighbors(board, tile);
    for (const n of neighbors) {
        if (n.numberToken && (n.numberToken === 6 || n.numberToken === 8)) {
            return true;
        }
    }
    return false;
}

function getNeighbors(board: HexTileData[], tile: HexTileData): HexTileData[] {
    const neighborCoords = [
        { q: tile.hex.q + 1, r: tile.hex.r },
        { q: tile.hex.q + 1, r: tile.hex.r - 1 },
        { q: tile.hex.q, r: tile.hex.r - 1 },
        { q: tile.hex.q - 1, r: tile.hex.r },
        { q: tile.hex.q - 1, r: tile.hex.r + 1 },
        { q: tile.hex.q, r: tile.hex.r + 1 },
    ];

    return board.filter(t =>
        neighborCoords.some(nc => nc.q === t.hex.q && nc.r === t.hex.r)
    );
}

/**
 * Calculate hex distance between two tiles (number of steps)
 */
function hexDistance(t1: HexTileData, t2: HexTileData): number {
    const dq = Math.abs(t1.hex.q - t2.hex.q);
    const dr = Math.abs(t1.hex.r - t2.hex.r);
    const ds = Math.abs((-t1.hex.q - t1.hex.r) - (-t2.hex.q - t2.hex.r));
    return Math.max(dq, dr, ds);
}

function checkFairness(board: HexTileData[]): boolean {
    // 1. Terrain fairness: No clusters of 3+ identical terrains
    // Check if any tile has 2+ neighbors of the same terrain (which would form a cluster of 3)
    for (const tile of board) {
        const neighbors = getNeighbors(board, tile);
        const sameTerrainNeighbors = neighbors.filter(n => n.terrain === tile.terrain);
        if (sameTerrainNeighbors.length >= 2) {
            return false;
        }
    }

    // 2. Low number balance: No single terrain type has 3+ low-probability numbers (2,3,11,12)
    // This prevents resource shortages like all low numbers on forests
    const LOW_NUMBERS = [2, 3, 11, 12];
    const lowNumbersByTerrain: Record<string, number> = {};
    for (const tile of board) {
        if (tile.numberToken && LOW_NUMBERS.includes(tile.numberToken)) {
            const terrain = tile.terrain;
            lowNumbersByTerrain[terrain] = (lowNumbersByTerrain[terrain] || 0) + 1;
            if (lowNumbersByTerrain[terrain] >= 3) {
                return false;
            }
        }
    }

    // 3. Red number (6/8) spatial separation: minimum 2 hexes apart
    // This prevents clustering of high-probability numbers
    const redTiles = board.filter(t => t.numberToken === 6 || t.numberToken === 8);
    for (let i = 0; i < redTiles.length; i++) {
        for (let j = i + 1; j < redTiles.length; j++) {
            if (hexDistance(redTiles[i], redTiles[j]) < 2) {
                return false;
            }
        }
    }

    // 4. Red number terrain diversity: 6s and 8s should be on different terrain types
    // Ideally no two 6s or two 8s on the same terrain
    const sixes = board.filter(t => t.numberToken === 6);
    const eights = board.filter(t => t.numberToken === 8);
    if (sixes.length === 2 && sixes[0].terrain === sixes[1].terrain) {
        return false;
    }
    if (eights.length === 2 && eights[0].terrain === eights[1].terrain) {
        return false;
    }

    // 5. Port proximity: Don't put 6/8 within 1 hex of a matching resource port
    // This prevents overpowered port locations (e.g., 8 on forest near wood port)
    for (const tile of redTiles) {
        if (tile.terrain === 'desert') continue;
        const tileResource = TERRAIN_TO_RESOURCE[tile.terrain as Exclude<TerrainType, 'desert'>];

        // Check if this hex is within 1 hex of a matching resource port
        for (const portInfo of PORT_HEX_RESOURCES) {
            if (portInfo.resource !== tileResource) continue;

            // Calculate distance from tile to port hex
            const portHex = { hex: { q: portInfo.q, r: portInfo.r } } as HexTileData;
            const distance = hexDistance(tile, portHex);

            if (distance <= 1) {
                // 6/8 too close to matching resource port
                return false;
            }
        }
    }

    // 6. Production fairness: No corner (3-hex intersection) exceeds pip threshold
    // Note: 6/8 adjacency is already handled by enforceAdjacencyRules
    const PIP_THRESHOLD = 11;
    for (const tile of board) {
        if (!tile.numberToken) continue;
        if (getPipsAtCorner(board, tile, 1, -1, 0, -1) > PIP_THRESHOLD) return false;
        if (getPipsAtCorner(board, tile, 1, -1, 1, 0) > PIP_THRESHOLD) return false;
    }

    return true;
}

function getPipsAtCorner(board: HexTileData[], t1: HexTileData, q2: number, r2: number, q3: number, r3: number): number {
    const h2 = board.find(t => t.hex.q === t1.hex.q + q2 && t.hex.r === t1.hex.r + r2);
    const h3 = board.find(t => t.hex.q === t1.hex.q + q3 && t.hex.r === t1.hex.r + r3);

    let pips = t1.pips || 0;
    if (h2) pips += (h2.pips || 0);
    if (h3) pips += (h3.pips || 0);

    return pips;
}
