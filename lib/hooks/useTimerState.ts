import { useState, useEffect } from 'react';
import { GameState } from '@/lib/types/game';
import { TimerStatus } from '@/lib/types/timer';
import { getTimerStatus } from '@/lib/services/timer-service';

/**
 * Hook to track timer state with live countdown updates.
 * Recalculates every second to provide real-time countdown.
 */
export function useTimerState(gameState: GameState): TimerStatus {
  const [tick, setTick] = useState(0);

  // Force a re-render when critical gameState values change
  useEffect(() => {
    setTick(prev => prev + 1);
  }, [
    gameState.currentTurnExtensions?.totalBorrowed,
    gameState.timerLocked
  ]);

  // Recalculate every second
  useEffect(() => {
    if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.turnStartTime,
    gameState.timerConfig?.enabled
  ]);

  // Calculate current timer status
  // Note: This recalculates on every render when tick changes OR when gameState changes
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
