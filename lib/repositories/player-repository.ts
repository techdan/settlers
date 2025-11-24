import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Player Repository
 * Handles all database operations for players
 */

/**
 * Find a player by ID
 * 
 * @param playerId - Player ID to search for
 * @returns Player record or null if not found
 */
export async function findPlayerById(playerId: string) {
    const player = await db.query.players.findFirst({
        where: eq(players.id, playerId)
    });

    return player;
}

/**
 * Find all players in a room
 * 
 * @param roomId - Room ID
 * @returns Array of player records
 */
export async function findPlayersByRoomId(roomId: string) {
    const roomPlayers = await db.query.players.findMany({
        where: eq(players.roomId, roomId)
    });

    return roomPlayers;
}

/**
 * Create a new player
 *
 * @param id - Player ID (UUID)
 * @param roomId - Room ID
 * @param name - Player name
 * @returns Created player record
 */
export async function createPlayer(id: string, roomId: string, name: string) {
    const created = await db.insert(players)
        .values({
            id,
            roomId,
            name,
            joinedAt: new Date()
        })
        .returning();

    return created[0];
}

/**
 * Delete a player
 * 
 * @param playerId - Player ID to delete
 */
export async function deletePlayer(playerId: string) {
    await db.delete(players).where(eq(players.id, playerId));
}

/**
 * Delete all players in a room
 * 
 * @param roomId - Room ID
 */
export async function deletePlayersByRoomId(roomId: string) {
    await db.delete(players).where(eq(players.roomId, roomId));
}

/**
 * Count players in a room
 * 
 * @param roomId - Room ID
 * @returns Number of players
 */
export async function countPlayersInRoom(roomId: string): Promise<number> {
    const roomPlayers = await findPlayersByRoomId(roomId);
    return roomPlayers.length;
}
