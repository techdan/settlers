import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PlayerColor } from '@/lib/types/player';

/**
 * Lobby Repository
 * Handles data access for lobby/room operations
 */

export async function getRoomById(roomId: string) {
    const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId)
    });
    return room ?? null;
}

export async function getRoomWithPlayers(roomId: string) {
    const room = await getRoomById(roomId);
    if (!room) return null;

    const roomPlayers = await getPlayersByRoomIdOrdered(roomId);

    return {
        ...room,
        players: roomPlayers
    };
}

export async function getPlayersByRoomIdOrdered(roomId: string) {
    return db.query.players.findMany({
        where: eq(players.roomId, roomId),
        orderBy: (playersTable, { asc }) => asc(playersTable.joinedAt)
    });
}

export async function updatePlayerColors(
    updates: Array<{ id: string; color: PlayerColor }>
) {
    await Promise.all(
        updates.map(update =>
            db.update(players)
                .set({ color: update.color })
                .where(eq(players.id, update.id))
        )
    );
}

export async function updatePlayerHostFlags(
    updates: Array<{ id: string; isHost: boolean }>
) {
    await Promise.all(
        updates.map(update =>
            db.update(players)
                .set({ isHost: update.isHost })
                .where(eq(players.id, update.id))
        )
    );
}

export async function updateRoomMetadata(roomId: string, metadata: string) {
    await db.update(rooms)
        .set({ metadata })
        .where(eq(rooms.id, roomId));
}

export async function setPlayerColor(playerId: string, color: PlayerColor) {
    await db.update(players)
        .set({ color })
        .where(eq(players.id, playerId));
}
