import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GameState } from '@/lib/types';

/**
 * Game Repository
 * Handles all database operations for games
 */

/**
 * Find a game by room ID
 * 
 * @param roomId - Room ID to search for
 * @returns Game record or null if not found
 */
export async function findGameByRoomId(roomId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId)
    });

    return game;
}

/**
 * Find a game by ID
 * 
 * @param gameId - Game ID to search for
 * @returns Game record or null if not found
 */
export async function findGameById(gameId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.id, gameId)
    });

    return game;
}

/**
 * Parse game state from database record
 * 
 * @param game - Database game record
 * @returns Parsed game state
 */
export function parseGameState(game: { state: string }): GameState {
    return JSON.parse(game.state) as GameState;
}

/**
 * Update game state in database
 * 
 * @param gameState - Updated game state
 * @returns Updated game record
 */
export async function updateGameState(gameState: GameState) {
    const updated = await db.update(games)
        .set({
            state: JSON.stringify(gameState),
            updatedAt: new Date()
        })
        .where(eq(games.id, gameState.id))
        .returning();

    return updated[0];
}

/**
 * Create a new game
 * 
 * @param roomId - Room ID for the game
 * @param gameState - Initial game state
 * @returns Created game record
 */
export async function createGame(roomId: string, gameState: GameState) {
    const created = await db.insert(games)
        .values({
            id: gameState.id,
            roomId,
            state: JSON.stringify(gameState),
            createdAt: new Date(),
            updatedAt: new Date()
        })
        .returning();

    return created[0];
}

/**
 * Delete a game
 * 
 * @param gameId - Game ID to delete
 */
export async function deleteGame(gameId: string) {
    await db.delete(games).where(eq(games.id, gameId));
}

/**
 * Get game state by room ID (convenience method)
 * 
 * @param roomId - Room ID
 * @returns Game state or null
 */
export async function getGameStateByRoomId(roomId: string): Promise<GameState | null> {
    const game = await findGameByRoomId(roomId);
    if (!game) return null;
    return parseGameState(game);
}
