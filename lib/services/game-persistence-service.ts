import { updateGameState } from '@/lib/repositories/game-repository';
import { syncTurnTimerPause } from '@/lib/services/timer-service';
import type { GameState } from '@/lib/types/game';

/**
 * Persist a game mutation after reconciling timer pause accounting.
 *
 * Pending obligations can be created by several domains, so keeping this
 * small orchestration seam in the service layer ensures every game action
 * applies the same timer rule before the repository writes the state.
 */
export async function persistGameState(gameState: GameState): Promise<void> {
    syncTurnTimerPause(gameState);
    await updateGameState(gameState);
}
