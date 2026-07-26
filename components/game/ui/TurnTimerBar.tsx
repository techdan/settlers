import { GameState } from '@/lib/types/game';
import { useTimerState, formatTime, getTimerColorClass, getProgressPercentage } from '@/lib/hooks/useTimerState';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

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

  // Get base time limit (without extensions) for progress bar calculation
  const baseTimeLimit = gameState.timerConfig?.turnTimeLimit || 180;
  const progressPercentage = getProgressPercentage(
    timerStatus.timeElapsed,
    timerStatus.timeLimit,
    baseTimeLimit
  );
  const colorClass = getTimerColorClass(timerStatus.timeRemaining, timerStatus.timeLimit);

  return (
    <div className="w-full">
      {/* Timer Bar */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-10 bg-[var(--ui-panel-raised)] rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div
            className={`h-full transition-all duration-1000 ease-linear ${colorClass}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Timer text overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="font-semibold text-sm text-[var(--ui-text)] drop-shadow-md">
            {isMyTurn ? 'Your Turn' : `${playerName}'s Turn`}
          </span>
          <span className="font-bold text-lg tabular-nums text-[var(--ui-text)] drop-shadow-md">
            {formatTime(timerStatus.timeRemaining)}
          </span>
        </div>
      </div>

      {/* Time expired warning */}
      {timerStatus.isExpired && isMyTurn && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2">
          <TabletopStatusIcon type="time" size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-[var(--ui-text)]">
            Time is up! Most actions are now disabled. Please complete any required actions and end your turn.
            {(gameState.playerTimeBanks?.[currentPlayerId] ?? 0) > 0 && (
              <> You can request more time from your time bank ({formatTime(gameState.playerTimeBanks?.[currentPlayerId] ?? 0)} remaining).</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
