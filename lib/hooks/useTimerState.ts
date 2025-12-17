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

  // Recalculate every second
  useEffect(() => {
    if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.timerConfig?.enabled]);

  // Calculate current timer status
  return getTimerStatus(gameState);
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get color class based on time remaining
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
 * Get progress bar width percentage
 */
export function getProgressPercentage(timeElapsed: number, timeLimit: number): number {
  if (timeLimit === 0) return 0;
  return Math.min(100, (timeElapsed / timeLimit) * 100);
}
