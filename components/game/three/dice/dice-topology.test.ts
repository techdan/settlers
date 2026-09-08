import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { diceBounce, DIE_FACES, DIE_NORMALS, dieSupportHeight, dieValue, EVENT_FACES, EVENT_TOP, settledDieQuaternion } from './dice-topology';

describe('authoritative dice face topology', () => {
    it('puts each requested number upward for every resting yaw', () => {
        for (const value of DIE_FACES) {
            for (const yaw of [-2.4, -0.2, 0, 0.7, Math.PI]) {
                const quaternion = settledDieQuaternion(value, yaw);
                const up = new Vector3(...DIE_NORMALS[DIE_FACES.indexOf(value)]).applyQuaternion(quaternion);
                expect(up.x).toBeCloseTo(0, 12);
                expect(up.y).toBeCloseTo(1, 12);
                expect(up.z).toBeCloseTo(0, 12);
                const visibleFaces = DIE_NORMALS.map(normal => new Vector3(...normal).applyQuaternion(quaternion).y);
                expect(visibleFaces.filter(y => y > 0.9999)).toHaveLength(1);
            }
        }
    });

    it('has opposite production faces totaling seven and exactly three ship faces', () => {
        for (let index = 0; index < 6; index += 2) {
            expect(DIE_FACES[index] + DIE_FACES[index + 1]).toBe(7);
        }
        expect(EVENT_FACES.filter(face => face === 'ship')).toHaveLength(3);
        for (const [face, value] of Object.entries(EVENT_TOP)) {
            const quaternion = settledDieQuaternion(value);
            const topIndex = DIE_NORMALS.findIndex(normal => new Vector3(...normal).applyQuaternion(quaternion).y > 0.9999);
            expect(EVENT_FACES[topIndex]).toBe(face);
        }
    });

    it('rejects absent and malformed production faces instead of inventing a result', () => {
        for (const invalid of [undefined, NaN, 0, 7, 1.5]) expect(dieValue(invalid)).toBeNull();
        for (const value of DIE_FACES) expect(dieValue(value)).toBe(value);
    });
});

describe('authored dice motion', () => {
    it('starts and finishes grounded with three successively smaller bounces', () => {
        for (const ground of [0, 0.5, 0.79, 1]) expect(diceBounce(ground)).toBeCloseTo(0, 12);
        expect(diceBounce(0.25)).toBeGreaterThan(diceBounce(0.645));
        expect(diceBounce(0.645)).toBeGreaterThan(diceBounce(0.895));
        for (let i = 0; i <= 100; i++) expect(diceBounce(i / 100)).toBeGreaterThanOrEqual(0);
    });

    it('keeps the rounded cube above the floor even while balanced on corners', () => {
        for (let i = 0; i < 30; i++) {
            const rotation = new Quaternion().setFromEuler(new Euler(i / 5, i / 7, i / 3));
            let lowestCoreCorner = Infinity;
            for (const x of [-0.43, 0.43]) {
                for (const y of [-0.43, 0.43]) {
                    for (const z of [-0.43, 0.43]) {
                        lowestCoreCorner = Math.min(lowestCoreCorner, new Vector3(x, y, z).applyQuaternion(rotation).y - 0.12);
                    }
                }
            }
            expect(dieSupportHeight(rotation) + lowestCoreCorner).toBeCloseTo(0, 12);
        }
        expect(dieSupportHeight(settledDieQuaternion(1))).toBeCloseTo(0.55, 12);
    });
});
