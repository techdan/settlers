import { describe, it, expect } from 'vitest';
import { getCanonicalVertexId } from '@/lib/hex';
import { getPortForVertex, generatePorts } from '@/core/engine/board/port-generator';

describe('Verify ALL ports are correctly mapped', () => {
    it('generates exactly 9 ports with correct type distribution', () => {
        const ports = generatePorts(60);
        expect(ports).toHaveLength(9);

        const typeCounts: Record<string, number> = {};
        ports.forEach(p => {
            typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
        });

        // Standard Catan has: 4 generic (3:1), 1 of each resource (2:1)
        expect(typeCounts['generic']).toBe(4);
        expect(typeCounts['wood']).toBe(1);
        expect(typeCounts['brick']).toBe(1);
        expect(typeCounts['sheep']).toBe(1);
        expect(typeCounts['wheat']).toBe(1);
        expect(typeCounts['ore']).toBe(1);
    });

    it('maps all port vertices correctly (no duplicates, no nulls)', () => {
        // All COASTLINE_EDGES with PORT_INDICES
        const COASTLINE_EDGES = [
            { q: 0, r: -2, edgeIndex: 3 },  // 0
            { q: 0, r: -2, edgeIndex: 4 },  // 1
            { q: 0, r: -2, edgeIndex: 5 },  // 2
            { q: 1, r: -2, edgeIndex: 4 },  // 3
            { q: 1, r: -2, edgeIndex: 5 },  // 4
            { q: 2, r: -2, edgeIndex: 4 },  // 5
            { q: 2, r: -2, edgeIndex: 5 },  // 6
            { q: 2, r: -2, edgeIndex: 0 },  // 7
            { q: 2, r: -1, edgeIndex: 5 },  // 8
            { q: 2, r: -1, edgeIndex: 0 },  // 9
            { q: 2, r: 0, edgeIndex: 5 },   // 10
            { q: 2, r: 0, edgeIndex: 0 },   // 11
            { q: 2, r: 0, edgeIndex: 1 },   // 12
            { q: 1, r: 1, edgeIndex: 0 },   // 13
            { q: 1, r: 1, edgeIndex: 1 },   // 14
            { q: 0, r: 2, edgeIndex: 0 },   // 15
            { q: 0, r: 2, edgeIndex: 1 },   // 16
            { q: 0, r: 2, edgeIndex: 2 },   // 17
            { q: -1, r: 2, edgeIndex: 1 },  // 18
            { q: -1, r: 2, edgeIndex: 2 },  // 19
            { q: -2, r: 2, edgeIndex: 1 },  // 20
            { q: -2, r: 2, edgeIndex: 2 },  // 21
            { q: -2, r: 2, edgeIndex: 3 },  // 22
            { q: -2, r: 1, edgeIndex: 2 },  // 23
            { q: -2, r: 1, edgeIndex: 3 },  // 24
            { q: -2, r: 0, edgeIndex: 2 },  // 25
            { q: -2, r: 0, edgeIndex: 3 },  // 26
            { q: -2, r: 0, edgeIndex: 4 },  // 27
            { q: -1, r: -1, edgeIndex: 3 }, // 28
            { q: -1, r: -1, edgeIndex: 4 }, // 29
        ];

        const PORT_INDICES = [
            { index: 29, type: 'sheep' },
            { index: 3, type: 'generic' },
            { index: 6, type: 'generic' },
            { index: 9, type: 'brick' },
            { index: 12, type: 'wood' },
            { index: 16, type: 'generic' },
            { index: 19, type: 'wheat' },
            { index: 23, type: 'ore' },
            { index: 26, type: 'generic' },
        ];

        const portVertexMap = new Map<string, string>();
        let totalVertices = 0;

        PORT_INDICES.forEach(config => {
            const edge = COASTLINE_EDGES[config.index];
            // Edge d connects corner (d+5)%6 and corner d (matching lib/hex.ts getEdgeEndpoints)
            const corner1 = (edge.edgeIndex + 5) % 6;
            const corner2 = edge.edgeIndex;

            const v1 = getCanonicalVertexId(edge.q, edge.r, corner1);
            const v2 = getCanonicalVertexId(edge.q, edge.r, corner2);

            console.log(`${config.type.toUpperCase().padEnd(8)} port: ${v1}, ${v2}`);

            // Check for duplicates
            if (portVertexMap.has(v1)) {
                throw new Error(`Duplicate vertex ${v1}: was ${portVertexMap.get(v1)}, now ${config.type}`);
            }
            if (portVertexMap.has(v2)) {
                throw new Error(`Duplicate vertex ${v2}: was ${portVertexMap.get(v2)}, now ${config.type}`);
            }

            portVertexMap.set(v1, config.type);
            portVertexMap.set(v2, config.type);

            // Verify getPortForVertex returns correct type
            expect(getPortForVertex(v1)).toBe(config.type);
            expect(getPortForVertex(v2)).toBe(config.type);

            totalVertices += 2;
        });

        // Should have 9 ports * 2 vertices each = 18 unique port vertices
        expect(totalVertices).toBe(18);
        expect(portVertexMap.size).toBe(18);
    });

    it('verifies specific known port vertices from the game', () => {
        // These are the actual vertices from the debug overlay
        // If you have a settlement on these vertices, you should get the port

        // Wood port: Edge 12 (Hex 2,0 E1) -> '2,0,0', '1,1,5'
        expect(getPortForVertex('1,1,5')).toBe('wood');
        expect(getPortForVertex('2,0,0')).toBe('wood');

        // Wheat port: Edge 19 (Hex -1,2 E2) -> '-2,3,5', '-2,2,0'
        expect(getPortForVertex('-2,2,0')).toBe('wheat');
        expect(getPortForVertex('-2,3,5')).toBe('wheat');

        // Brick port: Edge 9 (Hex 2,-1 E0) -> '2,-1,5', '2,-1,0'
        expect(getPortForVertex('2,-1,5')).toBe('brick');
        expect(getPortForVertex('2,-1,0')).toBe('brick');

        // Sheep port: Edge 29 (Hex -1,-1 E4) -> '-2,-1,5', '-1,-2,0'
        expect(getPortForVertex('-1,-2,0')).toBe('sheep');
        expect(getPortForVertex('-2,-1,5')).toBe('sheep');

        // Ore port: Edge 23 (Hex -2,1 E2) -> '-3,2,5', '-3,1,0'
        expect(getPortForVertex('-3,1,0')).toBe('ore');
        expect(getPortForVertex('-3,2,5')).toBe('ore');

        // Generic port #1: Edge 3 (Hex 1,-2 E4) -> '0,-2,5', '1,-3,0'
        expect(getPortForVertex('1,-3,0')).toBe('generic');
        expect(getPortForVertex('0,-2,5')).toBe('generic');

        // Generic port #2: Edge 6 (Hex 2,-2 E5) -> '2,-3,0', '2,-2,5'
        expect(getPortForVertex('2,-3,0')).toBe('generic');
        expect(getPortForVertex('2,-2,5')).toBe('generic');

        // Generic port #3: Edge 16 (Hex 0,2 E1) -> '0,2,0', '-1,3,5'
        expect(getPortForVertex('-1,3,5')).toBe('generic');
        expect(getPortForVertex('0,2,0')).toBe('generic');

        // Generic port #4: Edge 26 (Hex -2,0 E3) -> '-3,0,0', '-3,0,5'
        expect(getPortForVertex('-3,0,5')).toBe('generic');
        expect(getPortForVertex('-3,0,0')).toBe('generic');
    });

    it('verifies non-port vertices return null', () => {
        // Interior vertices should not have ports
        expect(getPortForVertex('0,0,0')).toBeNull();
        expect(getPortForVertex('0,1,0')).toBeNull();
        expect(getPortForVertex('-1,0,0')).toBeNull();
        expect(getPortForVertex('1,0,1')).toBeNull();
    });
});
