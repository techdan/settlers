/** Explicit RPC payload encoding preserves database record dates and undefined. */
export function encodeRoomResult(value: unknown): string {
    return JSON.stringify({ value }, function (key, encoded) {
        const original = this[key];
        return original instanceof Date ? { $roomDate: original.toISOString() } : encoded;
    });
}

export function decodeRoomResult(json: string): unknown {
    return JSON.parse(json, (_key, value) => {
        if (value && typeof value === 'object' && Object.keys(value).length === 1 && typeof value.$roomDate === 'string') {
            return new Date(value.$roomDate);
        }
        return value;
    }).value;
}
