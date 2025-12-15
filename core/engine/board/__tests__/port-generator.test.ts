import { describe, expect, it } from 'vitest';
import {
    generatePorts,
    getTradeRatio,
    getPortForVertex,
    getBestTradeRatio,
    PortType
} from '../port-generator';

describe('Port Generator', () => {
    describe('generatePorts', () => {
        it('generates correct number of ports', () => {
            const ports = generatePorts(60); // hexSize 60
            // PORT_INDICES has 9 entries
            expect(ports).toHaveLength(9);
        });

        it('assigns correct types to ports', () => {
            const ports = generatePorts(60);

            // Check counts of each type based on PORT_INDICES constants
            // sheep: 1, generic: 4, brick: 1, wood: 1, wheat: 1, ore: 1
            const counts: Record<string, number> = {};
            ports.forEach(p => {
                counts[p.type] = (counts[p.type] || 0) + 1;
            });

            expect(counts['sheep']).toBe(1);
            expect(counts['generic']).toBe(4);
            expect(counts['brick']).toBe(1);
            expect(counts['wood']).toBe(1);
            expect(counts['wheat']).toBe(1);
            expect(counts['ore']).toBe(1);
        });

        it('assigns 2 vertices per port', () => {
            const ports = generatePorts(60);
            ports.forEach(p => {
                expect(p.vertices).toHaveLength(2);
                expect(p.vertices?.[0]).toHaveProperty('x');
                expect(p.vertices?.[1]).toHaveProperty('y');
            });
        });
    });

    describe('getTradeRatio', () => {
        it('returns 3 for generic ports', () => {
            const ratio = getTradeRatio('generic', 'wood');
            expect(ratio).toBe(3);
        });

        it('returns 2 for specific resource ports', () => {
            expect(getTradeRatio('wood' as PortType, 'wood')).toBe(2);
            expect(getTradeRatio('brick' as PortType, 'any')).toBe(2); // implementation doesn't check resource type currently
        });

        it('returns 4 for no port (null)', () => {
            expect(getTradeRatio(null, 'wood')).toBe(4);
        });
    });

    describe('getPortForVertex', () => {
        it('returns the correct port type for a wood port vertex', () => {
            // Wood port is at index 12: { index: 12, type: 'wood' }
            // COASTLINE_EDGES[12] = { q: 2, r: 0, edgeIndex: 1 }
            // Edge 1 connects corners (1+5)%6=0 and 1
            // Canonical vertex IDs are: 2,0,0 and 1,1,5
            const portType1 = getPortForVertex('1,1,5');
            const portType2 = getPortForVertex('2,0,0');

            expect(portType1).toBe('wood');
            expect(portType2).toBe('wood');
        });

        it('returns the correct port type for a brick port vertex', () => {
            // Brick port is at index 9: { index: 9, type: 'brick' }
            // COASTLINE_EDGES[9] = { q: 2, r: -1, edgeIndex: 0 }
            // Edge 0 connects corners (0+5)%6=5 and 0
            // Canonical vertex IDs are: 2,-1,5 and 2,-1,0
            const portType1 = getPortForVertex('2,-1,5');
            const portType2 = getPortForVertex('2,-1,0');

            expect(portType1).toBe('brick');
            expect(portType2).toBe('brick');
        });

        it('returns null for vertices without ports', () => {
            // Center hex (0,0) should have no ports
            const portType = getPortForVertex('0,0,0');
            expect(portType).toBeNull();
        });
    });

    describe('getBestTradeRatio', () => {
        it('returns 4 for no ports', () => {
            const ratio = getBestTradeRatio(['0,0,0', '0,0,1'], 'wood');
            expect(ratio).toBe(4);
        });

        it('returns 2 for matching resource port', () => {
            // Wood port canonical vertices: 1,1,5 and 1,0,0
            const ratio = getBestTradeRatio(['1,1,5', '1,0,0'], 'wood');
            expect(ratio).toBe(2);
        });

        it('returns 3 for generic port', () => {
            // Generic port canonical vertices: 1,-3,0 and 1,-2,5
            const ratio = getBestTradeRatio(['1,-3,0', '1,-2,5'], 'wood');
            expect(ratio).toBe(3);
        });

        it('returns best ratio when player has multiple ports', () => {
            // Mix of generic (3:1) and wood port (2:1) for wood
            const ratio = getBestTradeRatio(['1,-3,0', '1,1,5'], 'wood');
            expect(ratio).toBe(2); // Should pick the wood port
        });

        it('returns 4 when specific port does not match resource', () => {
            // Wood port vertices but trading brick
            const ratio = getBestTradeRatio(['1,1,5', '1,0,0'], 'brick');
            expect(ratio).toBe(4);
        });

        it('returns 3 when only generic port available for non-matching resource', () => {
            // Generic port for brick
            const ratio = getBestTradeRatio(['1,-3,0', '1,-2,5'], 'brick');
            expect(ratio).toBe(3);
        });
    });
});
