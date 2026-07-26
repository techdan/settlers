import { GameState } from '@/lib/types/game';
import { useTimerState, formatTime } from '@/lib/hooks/useTimerState';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

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
    <div className="rounded-lg border-2 border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <TabletopStatusIcon type="time" size={26} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--ui-text)]">
            Time is up!
          </p>
          <p className="mt-0.5 text-xs text-[var(--ui-muted)]">
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
