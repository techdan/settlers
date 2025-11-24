import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Room Repository
 * Handles all database operations for rooms
 */

/**
 * Find a room by ID
 * 
 * @param roomId - Room ID to search for
 * @returns Room record or null if not found
 */
export async function findRoomById(roomId: string) {
    const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId)
    });

    return room;
}

/**
 * Find a room by code (room.id is the code)
 *
 * @param code - Room code to search for
 * @returns Room record or null if not found
 */
export async function findRoomByCode(code: string) {
    return findRoomById(code);
}

/**
 * Create a new room
 *
 * @param code - Room code (becomes the room ID)
 * @returns Created room record
 */
export async function createRoom(code: string) {
    const created = await db.insert(rooms)
        .values({
            id: code,
            status: 'waiting',
            createdAt: new Date()
        })
        .returning();

    return created[0];
}

/**
 * Update room status
 * 
 * @param roomId - Room ID
 * @param status - New status
 * @returns Updated room record
 */
export async function updateRoomStatus(
    roomId: string,
    status: 'waiting' | 'in_progress' | 'finished'
) {
    const updated = await db.update(rooms)
        .set({ status })
        .where(eq(rooms.id, roomId))
        .returning();

    return updated[0];
}

/**
 * Delete a room
 * 
 * @param roomId - Room ID to delete
 */
export async function deleteRoom(roomId: string) {
    await db.delete(rooms).where(eq(rooms.id, roomId));
}
