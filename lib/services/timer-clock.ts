import type { GameState } from '@/lib/types/game';

/**
 * Attach a stable client/server clock offset when authoritative state arrives.
 *
 * The turn start timestamp is created on the server, so comparing it directly
 * with a device clock makes the countdown inherit any device clock skew.
 * Reuse the existing offset when an update carries the same server sample;
 * this avoids resetting elapsed time for legacy write paths that did not
 * refresh the sample.
 */
export function synchronizeTimerClock(
  gameState: GameState,
  previousState?: GameState | null
): GameState {
  if (gameState.timerServerTime === undefined) {
    return gameState;
  }

  const previousOffset =
    previousState?.timerServerTime === gameState.timerServerTime
      ? previousState.timerClockOffsetMs
      : undefined;

  return {
    ...gameState,
    timerClockOffsetMs:
      previousOffset ?? Date.now() - gameState.timerServerTime,
  };
}
