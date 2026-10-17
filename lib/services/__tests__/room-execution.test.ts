// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RoomExecution, type RoomStorage } from '../room-execution';
import { decodeRoomData, roomData } from '@/lib/repositories/room-context';

function storage(): RoomStorage & { value: string | null } {
    return {
        value: null,
        read() { return this.value; },
        write(value) { this.value = value; },
    };
}

describe('durable room execution', () => {
    it('serializes concurrent actions including their reads', async () => {
        const backing = storage();
        const room = new RoomExecution('ABCD', backing);
        await room.run(async () => {
            roomData().room = { id: 'ABCD', status: '0', metadata: null, createdAt: new Date() };
        });
        await Promise.all(Array.from({ length: 20 }, () => room.run(async () => {
            const record = roomData().room!;
            const count = Number(record.status);
            await Promise.resolve();
            record.status = String(count + 1);
        })));
        expect(decodeRoomData(backing.value!).room?.status).toBe('20');
        expect(decodeRoomData(backing.value!).revision).toBe(21);
    });

    it('rolls back failed operations and continues processing', async () => {
        const backing = storage();
        const room = new RoomExecution('ABCD', backing);
        await expect(room.run(async () => {
            roomData().room = { id: 'ABCD', status: 'bad', metadata: null, createdAt: new Date() };
            throw new Error('Invalid move');
        })).rejects.toThrow('Invalid move');
        expect(backing.value).toBeNull();
        expect(await room.run(async () => roomData().room)).toBeNull();
    });

    it('recovers persisted state and dates with a fresh executor', async () => {
        const backing = storage();
        const createdAt = new Date('2026-10-17T00:00:00Z');
        await new RoomExecution('ABCD', backing).run(async () => {
            roomData().room = { id: 'ABCD', status: 'waiting', metadata: null, createdAt };
        });
        const restored = await new RoomExecution('ABCD', backing).run(async () => roomData().room);
        expect(restored?.createdAt).toEqual(createdAt);
        expect(restored?.createdAt).toBeInstanceOf(Date);
    });

    it('isolates async room contexts and rejects cross-room access', async () => {
        const first = new RoomExecution('ABCD', storage());
        const second = new RoomExecution('EFGH', storage());
        const result = await Promise.all([first, second].map(room => room.run(async () => {
            await Promise.resolve();
            return roomData().roomId;
        })));
        expect(result).toEqual(['ABCD', 'EFGH']);
        await expect(first.run(async () => roomData('EFGH'))).rejects.toThrow('Cross-room');
        expect(() => roomData()).toThrow('outside');
    });

    it('does not broadcast or retain state when persistence fails', async () => {
        const backing = storage();
        let broadcasts = 0;
        backing.write = () => { throw new Error('Storage unavailable'); };
        const room = new RoomExecution('ABCD', backing);
        await expect(room.run(async () => {
            roomData().room = { id: 'ABCD', status: 'waiting', metadata: null, createdAt: new Date() };
        }, () => broadcasts++)).rejects.toThrow('Storage unavailable');
        expect(broadcasts).toBe(0);
        expect(await room.run(async () => roomData().room)).toBeNull();
    });
});
