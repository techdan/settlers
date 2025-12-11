import { describe, expect, it } from 'vitest';
import {
    generatePorts,
    getTradeRatio,
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
                expect(p.vertices[0]).toHaveProperty('x');
                expect(p.vertices[0]).toHaveProperty('y');
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
});
