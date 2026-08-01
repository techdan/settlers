import { getGameStateByRoomId } from '@/lib/repositories/game-repository';
import { persistGameState } from '@/lib/services/game-persistence-service';
import { requestExtension } from '@/lib/services/timer-service';
import type { ExtensionRequestResult } from '@/lib/types/timer';

export async function requestTimeExtensionForGame(
    roomId: string,
    playerId: string
): Promise<ExtensionRequestResult> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    const result = requestExtension(gameState, playerId);
    if (!result.success) {
        throw new Error(result.error || 'Failed to request extension');
    }

    if (result.newState) {
        await persistGameState(result.newState);
    }

    return result;
}
