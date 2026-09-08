import { Euler, Quaternion, Vector3 } from 'three';
import type { EventDieFace } from '@/core/rules/commodity-constants';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

// Three BoxGeometry / RoundedBoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z.
// Opposite production faces sum to seven, including during the tumble.
export const DIE_FACES: readonly DieValue[] = [3, 4, 1, 6, 2, 5];
export const DIE_NORMALS: readonly (readonly [number, number, number])[] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
export const EVENT_FACES: readonly EventDieFace[] = ['science', 'ship', 'ship', 'trade', 'politics', 'ship'];
export const EVENT_TOP: Record<EventDieFace, DieValue> = { science: 3, ship: 1, trade: 6, politics: 2 };

const TOP_ROTATIONS: Record<DieValue, readonly [number, number, number]> = {
    1: [0, 0, 0],
    2: [-Math.PI / 2, 0, 0],
    3: [0, 0, Math.PI / 2],
    4: [0, 0, -Math.PI / 2],
    5: [Math.PI / 2, 0, 0],
    6: [Math.PI, 0, 0],
};

const UP = new Vector3(0, 1, 0);

export function dieValue(value: number | undefined): DieValue | null {
    return value !== undefined && Number.isInteger(value) && value >= 1 && value <= 6 ? value as DieValue : null;
}

/** Yaw changes the resting pose while preserving the requested upward face. */
export function settledDieQuaternion(value: DieValue, yaw = 0): Quaternion {
    const rotation = TOP_ROTATIONS[value];
    const top = new Quaternion().setFromEuler(new Euler(...rotation));
    return top.premultiply(new Quaternion().setFromAxisAngle(UP, yaw));
}

/** Three authored, diminishing bounces; no random or physics-derived outcome. */
export function diceBounce(progress: number): number {
    const t = Math.max(0, Math.min(1, progress));
    const intervals = [0, 0.5, 0.79, 1];
    const heights = [0.93, 0.31, 0.085];
    for (let i = 0; i < heights.length; i++) {
        if (t <= intervals[i + 1]) {
            const local = (t - intervals[i]) / (intervals[i + 1] - intervals[i]);
            return 4 * heights[i] * local * (1 - local);
        }
    }
    return 0;
}

/** Exact support height of our rounded cube, preventing floor penetration. */
export function dieSupportHeight(rotation: Quaternion, halfSize = 0.55, radius = 0.12): number {
    const { x, y, z, w } = rotation;
    const rowX = 2 * (x * y + z * w);
    const rowY = 1 - 2 * (x * x + z * z);
    const rowZ = 2 * (y * z - x * w);
    return (halfSize - radius) * (Math.abs(rowX) + Math.abs(rowY) + Math.abs(rowZ)) + radius;
}
