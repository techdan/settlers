import { GameState } from '@/lib/types/game';
import { useTimerState, formatTime } from '@/lib/hooks/useTimerState';

interface TurnTimerExpiredNotificationProps {
  gameState: GameState;
  currentPlayerId: string;
}

export function TurnTimerExpiredNotification({ gameState, currentPlayerId }: TurnTimerExpiredNotificationProps) {
  const timerStatus = useTimerState(gameState);

  // Only show if timer is enabled, expired, and it's the current player's turn
  if (!gameState.timerConfig?.enabled || !timerStatus.isExpired || gameState.currentTurn !== currentPlayerId) {
    return null;
  }

  const timeBank = gameState.playerTimeBanks?.[currentPlayerId] ?? 0;

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-600 rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="text-2xl">⏱️</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            Time is up!
          </p>
          <p className="text-xs text-orange-800 dark:text-orange-200 mt-0.5">
            Most actions are disabled. Complete required actions and end your turn.
            {timeBank > 0 && (
              <> You have {formatTime(timeBank)} in your time bank to extend if needed.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
