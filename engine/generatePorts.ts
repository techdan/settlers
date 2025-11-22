import { Port, PortType } from '@/types/board';
import { hexToPixel, createHex } from '@/lib/hex';

interface EdgeDef {
    q: number;
    r: number;
    edgeIndex: number;
}

// The 30 exposed edges of the outer ring, in clockwise order
// Starting from Hex(0, -2) Edge 3 (West)
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
    { q: 0, r: 2, edgeIndex: 0 },   // 15: P4 Wood (Moved from 14)
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

// Port Indices in the COASTLINE_EDGES array
// Rotated counter-clockwise by 2 edges (index - 2)
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

// Edge angles for Pointy Top Hexes (Normal vectors pointing OUT)
const EDGE_ANGLES = [0, 60, 120, 180, 240, 300];

export const generatePorts = (hexSize: number): Port[] => {
    return PORT_INDICES.map((config, i) => {
        const edgeDef = COASTLINE_EDGES[config.index];
        const hex = createHex(edgeDef.q, edgeDef.r);
        const center = hexToPixel(hex, hexSize);

        // Calculate edge midpoint
        const dist = hexSize * Math.sqrt(3) / 2;
        const angleDeg = EDGE_ANGLES[edgeDef.edgeIndex];
        const angleRad = angleDeg * Math.PI / 180;

        const x = center.x + dist * Math.cos(angleRad);
        const y = center.y + dist * Math.sin(angleRad);

        // Port angle should point INWARD to the hex center
        const portAngle = (angleDeg + 180) % 360;

        // Calculate vertices for the port (for visualization lines)
        // Vertices are at +/- size/2 along the tangent vector
        // Tangent is angleRad + 90 deg
        const tangentRad = angleRad + Math.PI / 2;
        const vDist = hexSize / 2;

        const v1 = {
            x: x + vDist * Math.cos(tangentRad),
            y: y + vDist * Math.sin(tangentRad)
        };

        const v2 = {
            x: x - vDist * Math.cos(tangentRad),
            y: y - vDist * Math.sin(tangentRad)
        };

        return {
            id: `port-${i}`,
            type: config.type as PortType,
            position: { x, y },
            angle: portAngle,
            vertices: [v1, v2]
        };
    });
};
