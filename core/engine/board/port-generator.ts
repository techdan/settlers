import { getEdgeEndpoints } from '@/lib/hex';
import { ResourceType } from './board-generator';

export type PortType = ResourceType | 'generic';

interface EdgeDef {
    q: number;
    r: number;
    edgeIndex: number;
}

/**
 * Coastline edges in clockwise order around the board
 * These define the 30 edges on the outer perimeter
 */
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

/**
 * Port configuration following standard Catan layout
 * Spacing pattern: 3-2-2-3-2-2-3-2-2 (edges between ports)
 */
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

/**
 * Initialize port mapping
 * Maps vertex IDs to their port types
 */
function initializePortMapping(): Record<string, PortType> {
    const mapping: Record<string, PortType> = {};

    PORT_INDICES.forEach(config => {
        const edgeDef = COASTLINE_EDGES[config.index];
        // Edge connects two vertices. We need to get the canonical IDs of these vertices.
        const [v1, v2] = getEdgeEndpoints(edgeDef.q, edgeDef.r, edgeDef.edgeIndex);

        mapping[v1] = config.type as PortType;
        mapping[v2] = config.type as PortType;
    });

    return mapping;
}

// Cached port mapping
const VERTEX_TO_PORT = initializePortMapping();

/**
 * Get the port type for a given vertex
 * 
 * @param vertexId - Canonical vertex ID
 * @returns Port type if vertex has a port, undefined otherwise
 */
export function getPortForVertex(vertexId: string): PortType | undefined {
    return VERTEX_TO_PORT[vertexId];
}

/**
 * Calculate trade ratio for a player at a vertex
 * 
 * @param vertexId - Vertex where player has a settlement/city
 * @param resource - Resource being traded
 * @returns Trade ratio (2, 3, or 4)
 */
export function getTradeRatio(vertexId: string, resource: ResourceType): number {
    const port = getPortForVertex(vertexId);

    if (!port) return 4; // Default 4:1 ratio

    if (port === 'generic') return 3; // Generic port 3:1

    if (port === resource) return 2; // Resource-specific port 2:1

    return 4; // Has a port, but not for this resource
}

/**
 * Get best trade ratio for a player across all their settlements
 * 
 * @param playerVertices - Array of vertex IDs where player has settlements/cities
 * @param resource - Resource being traded
 * @returns Best available trade ratio
 */
export function getBestTradeRatio(
    playerVertices: string[],
    resource: ResourceType
): number {
    let bestRatio = 4; // Default

    for (const vertexId of playerVertices) {
        const ratio = getTradeRatio(vertexId, resource);
        if (ratio < bestRatio) {
            bestRatio = ratio;
        }
    }

    return bestRatio;
}
