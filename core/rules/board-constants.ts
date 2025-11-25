export const BOARD_SHAPE = {
    rows: [3, 4, 5, 4, 3],
    totalHexes: 19,
} as const;

export type TerrainType = 'forest' | 'hill' | 'pasture' | 'field' | 'mountain' | 'desert';
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

export const TERRAIN_COUNTS: Record<TerrainType, number> = {
    forest: 4,
    pasture: 4,
    field: 4,
    hill: 3,
    mountain: 3,
    desert: 1,
} as const;

export const TERRAIN_TO_RESOURCE: Record<Exclude<TerrainType, 'desert'>, ResourceType> = {
    forest: 'wood',
    hill: 'brick',
    pasture: 'sheep',
    field: 'wheat',
    mountain: 'ore',
};

export const TOKEN_COUNTS = {
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 1,
} as const;

export const TOKEN_PIPS: Record<number, number> = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1,
};

// Spiral order for token placement (skipping desert)
// Outer ring -> Inner ring -> Center
// This sequence matches the user's request exactly:
// [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 11, 4, 3, 5, 6]
export const SPIRAL_TOKEN_ORDER = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 11, 4, 3, 5, 6];

// Coordinates for the spiral path (Outer -> Inner -> Center)
// We need to define the exact path of coordinates to match the token order.
// The user says: "Start at the top-most hex, Move counter-clockwise around the outer ring, After 12 positions, move to next ring inside, Final token goes on the center tile"

// Let's define the coordinates.
// Top-most hex: (0, -2) ? No, rows are 3,4,5,4,3.
// Row 0 (top): (-2,0) is not top.
// Let's map the user's coordinates to the spiral.
// Valid positions:
// (-2,0), (-2,1), (-2,2)
// (-1,-1), (-1,0), (-1,1), (-1,2)
// (0,-2), (0,-1), (0,0), (0,1), (0,2)
// (1,-2), (1,-1), (1,0), (1,1)
// (2,-2), (2,-1), (2,0)

// Wait, the user's coordinates:
// (-2,0), (-2,1), (-2,2) -> q=-2 column?
// Let's visualize standard axial coords.
// q is column (slanted), r is row.
// usually q goes from -2 to 2.
// r goes from -2 to 2.
// s = -q-r.

// User's list:
// (-2,0), (-2,1), (-2,2) -> q=-2. r=0,1,2. s=2,1,0.
// (-1,-1), (-1,0), (-1,1), (-1,2) -> q=-1. r=-1..2.
// (0,-2)...(0,2) -> q=0. r=-2..2.
// (1,-2)...(1,1) -> q=1. r=-2..1.
// (2,-2)...(2,0) -> q=2. r=-2..0.

// This looks like a standard hexagon shape.
// Top most hex?
// Usually "top" means min r (if pointy top) or min q (if flat top).
// Catan is usually pointy top hexes, arranged in a big hexagon.
// If pointy top hexes:
// r is rows?
// Let's assume standard Catan layout.
// Top row: q=0,r=-2; q=1,r=-2; q=2,r=-2. (Wait, user listed (0,-2), (1,-2), (2,-2))
// Let's check the user's list again.
// (-2,0), (-2,1), (-2,2)
// (-1,-1), (-1,0), (-1,1), (-1,2)
// (0,-2), (0,-1), (0,0), (0,1), (0,2)
// (1,-2), (1,-1), (1,0), (1,1)
// (2,-2), (2,-1), (2,0)

// Let's try to trace the outer ring.
// Outer ring has 12 hexes.
// Inner ring has 6 hexes.
// Center has 1 hex.

// Outer ring coordinates (counter-clockwise starting from top):
// "Top-most hex".
// In (q,r) coordinates:
// (0,-2) is top-center?
// Let's verify neighbors.
// (0,-2) neighbors: (1,-2), (0,-1), (-1,-1), (-1,-2 invalid), (0,-3 invalid), (1,-3 invalid).
// (0,-2) is on the edge.

// Let's define the spiral path manually.
// Outer Ring (12):
// Start top: (0, -2)
// CCW:
// (-1, -1)
// (-2, 0)
// (-2, 1)
// (-2, 2)
// (-1, 2)
// (0, 2)
// (1, 1)
// (2, 0)
// (2, -1)
// (2, -2)
// (1, -2)
// Back to (0, -2) - loop closed.

// Inner Ring (6):
// Start top of inner: (0, -1)
// CCW:
// (-1, 0)
// (-1, 1)
// (0, 1)
// (1, 0)
// (1, -1)
// Back to (0, -1) - loop closed.

// Center (1):
// (0, 0)

// Total 19. Matches.

export const SPIRAL_COORDS = [
    // Outer Ring (12)
    { q: 0, r: -2 }, // Top
    { q: -1, r: -1 },
    { q: -2, r: 0 },
    { q: -2, r: 1 },
    { q: -2, r: 2 },
    { q: -1, r: 2 },
    { q: 0, r: 2 }, // Bottom
    { q: 1, r: 1 },
    { q: 2, r: 0 },
    { q: 2, r: -1 },
    { q: 2, r: -2 },
    { q: 1, r: -2 },

    // Inner Ring (6)
    { q: 0, r: -1 }, // Top Inner
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
    { q: 1, r: 0 },
    { q: 1, r: -1 },

    // Center (1)
    { q: 0, r: 0 },
];
