import { roomData } from './room-context';
import type { GameState } from '@/lib/types';

export async function findGameByRoomId(roomId: string) {
    return roomData(roomId).game ?? undefined;
}
export async function findGameById(gameId: string) {
    const game = roomData().game;
    return game?.id === gameId ? game : undefined;
}
export function parseGameState(game: { state: string }): GameState {
    return JSON.parse(game.state) as GameState;
}
function serializeGame(gameState: GameState) {
    const state = { ...gameState, timerServerTime: Date.now() };
    delete state.timerClockOffsetMs;
    return JSON.stringify(state);
}
export async function updateGameState(gameState: GameState) {
    const game = roomData().game;
    if (!game || game.id !== gameState.id) throw new Error('Game not found');
    game.state = serializeGame(gameState);
    game.updatedAt = new Date();
    return game;
}
export async function createGame(roomId: string, gameState: GameState) {
    const data = roomData(roomId);
    if (data.game) throw new Error('Game already exists');
    const now = new Date();
    data.game = { id: gameState.id, roomId, state: serializeGame(gameState), createdAt: now, updatedAt: now };
    return data.game;
}
export async function deleteGame(gameId: string) {
    const data = roomData();
    if (data.game?.id === gameId) data.game = null;
}
export async function getGameStateByRoomId(roomId: string): Promise<GameState | null> {
    const game = await findGameByRoomId(roomId);
    return game ? parseGameState(game) : null;
}
