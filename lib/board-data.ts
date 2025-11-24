import { createHex, Hex } from './hex';

export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert';

export interface HexTileData {
    hex: Hex;
    resource: ResourceType;
    numberToken: number | null;
    id: string;
}

// Fixed layout for "Standard" setup (variable, but deterministic for this phase)
// This is just one possible permutation.
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

export const generateStandardBoard = (): HexTileData[] => {
    return TILE_LAYOUT.map(t => ({
        hex: createHex(t.q, t.r),
        resource: t.res as ResourceType,
        numberToken: t.num,
        id: `${t.q},${t.r}`
    }));
};

// Port Logic
import { getCanonicalVertexId } from './hex';

interface EdgeDef {
    q: number;
    r: number;
    edgeIndex: number;
}

const COASTLINE_EDGES: EdgeDef[] = [
    { q: 0, r: -2, edgeIndex: 3 },  // 0
    { q: 0, r: -2, edgeIndex: 4 },  // 1: P0 Sheep
    { q: 0, r: -2, edgeIndex: 5 },  // 2
    { q: 1, r: -2, edgeIndex: 4 },  // 3
    { q: 1, r: -2, edgeIndex: 5 },  // 4
    { q: 2, r: -2, edgeIndex: 4 },  // 5: P1 Generic
    { q: 2, r: -2, edgeIndex: 5 },  // 6
    { q: 2, r: -2, edgeIndex: 0 },  // 7
    { q: 2, r: -1, edgeIndex: 5 },  // 8: P2 Generic
    { q: 2, r: -1, edgeIndex: 0 },  // 9
    { q: 2, r: 0, edgeIndex: 5 },   // 10
    { q: 2, r: 0, edgeIndex: 0 },   // 11: P3 Brick
    { q: 2, r: 0, edgeIndex: 1 },   // 12
    { q: 1, r: 1, edgeIndex: 0 },   // 13
    { q: 1, r: 1, edgeIndex: 1 },   // 14
    { q: 0, r: 2, edgeIndex: 0 },   // 15: P4 Wood
    { q: 0, r: 2, edgeIndex: 1 },   // 16
    { q: 0, r: 2, edgeIndex: 2 },   // 17
    { q: -1, r: 2, edgeIndex: 1 },  // 18: P5 Generic
    { q: -1, r: 2, edgeIndex: 2 },  // 19
    { q: -2, r: 2, edgeIndex: 1 },  // 20
    { q: -2, r: 2, edgeIndex: 2 },  // 21: P6 Wheat
    { q: -2, r: 2, edgeIndex: 3 },  // 22
    { q: -2, r: 1, edgeIndex: 2 },  // 23
    { q: -2, r: 1, edgeIndex: 3 },  // 24
    { q: -2, r: 0, edgeIndex: 2 },  // 25: P7 Ore
    { q: -2, r: 0, edgeIndex: 3 },  // 26
    { q: -2, r: 0, edgeIndex: 4 },  // 27
    { q: -1, r: -1, edgeIndex: 3 }, // 28: P8 Generic
    { q: -1, r: -1, edgeIndex: 4 }, // 29
];

export type PortType = ResourceType | 'generic';

const PORT_INDICES = [
    { index: 29, type: 'sheep' },
    { index: 3, type: 'generic' },
    { index: 6, type: 'generic' },
    { index: 9, type: 'brick' },
    { index: 13, type: 'wood' },
    { index: 16, type: 'generic' },
    { index: 19, type: 'wheat' },
    { index: 23, type: 'ore' },
    { index: 26, type: 'generic' },
];

// Map vertex ID to PortType
const VERTEX_TO_PORT: Record<string, PortType> = {};

// Initialize mapping
PORT_INDICES.forEach(config => {
    const edgeDef = COASTLINE_EDGES[config.index];
    // Edge connects vertex d and (d+1)%6
    const v1 = getCanonicalVertexId(edgeDef.q, edgeDef.r, edgeDef.edgeIndex);
    const v2 = getCanonicalVertexId(edgeDef.q, edgeDef.r, (edgeDef.edgeIndex + 1) % 6);

    VERTEX_TO_PORT[v1] = config.type as PortType;
    VERTEX_TO_PORT[v2] = config.type as PortType;
});

export const getPortForVertex = (vertexId: string): PortType | undefined => {
    return VERTEX_TO_PORT[vertexId];
};
