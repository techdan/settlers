import { GameState } from '@/lib/types/game';
import { formatTime } from '@/lib/hooks/useTimerState';

interface TimeBankDisplayProps {
  gameState: GameState;
  playerId: string;
  compact?: boolean;
}

export function TimeBankDisplay({ gameState, playerId, compact = false }: TimeBankDisplayProps) {
  // Don't show if timer not enabled
  if (!gameState.timerConfig?.enabled) {
    return null;
  }

  const timeBank = gameState.playerTimeBanks?.[playerId] ?? 0;
  const totalTime = gameState.playerTotalTime?.[playerId] ?? 0;

  if (compact) {
    // Compact view for player cards
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="opacity-70">🏦</span>
        <span className="font-medium tabular-nums">{formatTime(timeBank)}</span>
      </div>
    );
  }

  // Full view with tooltip
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">Time Bank:</span>
        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {formatTime(timeBank)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-500">Total Played:</span>
        <span className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
          {formatTime(totalTime)}
        </span>
      </div>
    </div>
  );
}
