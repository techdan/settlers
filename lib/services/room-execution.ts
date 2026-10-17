import { decodeRoomData, emptyRoomData, withRoomData, type RoomData } from '@/lib/repositories/room-context';

export interface RoomStorage {
    read(): string | null;
    write(value: string): void;
}

/** Serializes the complete read/validate/write operation for one room. */
export class RoomExecution {
    private pending: Promise<void> = Promise.resolve();

    constructor(private readonly roomId: string, private readonly storage: RoomStorage) {}

    run<T>(operation: () => Promise<T>, committed?: (data: RoomData) => void): Promise<T> {
        const result = this.pending.then(async () => {
            const stored = this.storage.read();
            const data = stored === null ? emptyRoomData(this.roomId) : decodeRoomData(stored);
            if (data.roomId !== this.roomId) throw new Error('Stored room identity mismatch');
            const before = JSON.stringify(data);
            const value = await withRoomData(data, operation);
            if (JSON.stringify(data) !== before) {
                data.revision++;
                this.storage.write(JSON.stringify(data));
                committed?.(data);
            }
            return value;
        });
        // A rejected action must not poison the next action's queue.
        this.pending = result.then(() => undefined, () => undefined);
        return result;
    }
}
