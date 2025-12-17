import { GameState } from '@/lib/types/game';
import { useTimerState, formatTime, getTimerColorClass, getProgressPercentage } from '@/lib/hooks/useTimerState';

interface TurnTimerBarProps {
  gameState: GameState;
  currentPlayerId: string;
}

export function TurnTimerBar({ gameState, currentPlayerId }: TurnTimerBarProps) {
  const timerStatus = useTimerState(gameState);

  // Don't show timer if not enabled or not active
  if (!gameState.timerConfig?.enabled || !timerStatus.isActive) {
    return null;
  }

  const isMyTurn = gameState.currentTurn === currentPlayerId;
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
  const playerName = currentPlayer?.name || 'Player';

  const progressPercentage = getProgressPercentage(timerStatus.timeElapsed, timerStatus.timeLimit);
  const colorClass = getTimerColorClass(timerStatus.timeRemaining, timerStatus.timeLimit);

  return (
    <div className="w-full">
      {/* Timer Bar */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div
            className={`h-full transition-all duration-1000 ease-linear ${colorClass}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Timer text overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="font-semibold text-sm text-slate-900 dark:text-white drop-shadow-md">
            {isMyTurn ? 'Your Turn' : `${playerName}'s Turn`}
          </span>
          <span className="font-bold text-lg tabular-nums text-slate-900 dark:text-white drop-shadow-md">
            {formatTime(timerStatus.timeRemaining)}
          </span>
        </div>
      </div>

      {/* Locked state warning */}
      {timerStatus.isLocked && isMyTurn && (
        <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            ⏱️ Time expired! Complete required actions and end your turn.
          </p>
        </div>
      )}
    </div>
  );
}
