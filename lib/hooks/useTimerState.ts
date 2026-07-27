import { useEffect, useReducer } from 'react';
import { GameState } from '@/lib/types/game';
import { TimerStatus } from '@/lib/types/timer';
import { getTimerStatus } from '@/lib/services/timer-service';

/**
 * Hook to track timer state with live countdown updates.
 * Recalculates every second to provide real-time countdown.
 */
export function useTimerState(gameState: GameState): TimerStatus {
  const [, forceRender] = useReducer(count => count + 1, 0);

  // Recalculate every second
  useEffect(() => {
    if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
      return;
    }

    const interval = setInterval(() => {
      forceRender();
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.turnStartTime,
    gameState.timerConfig?.enabled
  ]);

  // Calculate current timer status
  // Recalculates whenever the interval or an authoritative state update renders.
  return getTimerStatus(gameState);
}

/**
 * Format seconds as MM:SS or HH:MM:SS.
 *
 * Lives in timer-service so the service can write the same clock format into
 * the game log that the HUD shows; re-exported here because every existing
 * caller imports it from this module.
 */
export { formatTime } from '@/lib/services/timer-service';

/**
 * Get color class based on time remaining (for progress bars with backgrounds)
 */
export function getTimerColorClass(timeRemaining: number, timeLimit: number): string {
  void timeLimit;

  if (timeRemaining <= 0) {
    return 'bg-red-600 text-white'; // Expired
  } else if (timeRemaining <= 10) {
    return 'bg-red-500 text-white animate-pulse'; // Red pulsing (10s)
  } else if (timeRemaining <= 30) {
    return 'bg-orange-500 text-white'; // Orange (30s)
  } else if (timeRemaining <= 60) {
    return 'bg-yellow-500 text-slate-900'; // Yellow (60s)
  }
  return 'bg-green-500 text-white'; // Green (normal)
}

/**
 * Get text color class based on time remaining (for text-only displays)
 */
export function getTimerTextColorClass(timeRemaining: number, timeLimit: number): string {
  void timeLimit;

  if (timeRemaining <= 0) {
    return 'text-red-600'; // Expired
  } else if (timeRemaining <= 10) {
    return 'text-red-500 animate-pulse'; // Red pulsing (10s)
  } else if (timeRemaining <= 30) {
    return 'text-orange-500'; // Orange (30s)
  } else if (timeRemaining <= 60) {
    return 'text-yellow-500'; // Yellow (60s)
  }
  return 'text-green-500'; // Green (normal)
}

/**
 * Get progress bar width percentage
 * Progress is calculated against the BASE time limit only, not including extensions.
 * This means the bar fills to 100% over the base time, and extensions are "bonus time"
 * that doesn't show progress beyond 100%.
 */
export function getProgressPercentage(
  timeElapsed: number,
  timeLimit: number,
  baseTimeLimit: number
): number {
  if (baseTimeLimit === 0) return 0;
  // Calculate progress based on base time only, cap at 100%
  return Math.min(100, (timeElapsed / baseTimeLimit) * 100);
}
