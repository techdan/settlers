import { GameState } from '@/lib/types/game';
import { Obligation } from '@/lib/types/timer';
import { getBlockingObligations } from '@/lib/services/obligation-tracker';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopModal } from '../ui/TabletopModal';

interface WaitingOverlayProps {
  gameState: GameState;
  currentPlayerId: string;
}

export function WaitingOverlay({ gameState, currentPlayerId }: WaitingOverlayProps) {
  const blockingObligations = getBlockingObligations(gameState);

  // Don't show if no blocking obligations
  if (blockingObligations.length === 0) {
    return null;
  }

  // Only show during waiting_for_roll phase (when someone would try to roll)
  if (gameState.phase !== 'waiting_for_roll') {
    return null;
  }

  // Only show if it's the current player's turn (they're the one trying to roll)
  if (gameState.currentTurn !== currentPlayerId) {
    return null;
  }

  // Alchemy has its own mandatory selector. The generic waiting dialog must
  // not cover that selector for the player who revealed the event die; other
  // players still get the normal waiting state through their own UI.
  if (gameState.pendingAlchemy?.playerId === currentPlayerId) {
    return null;
  }

  // Group obligations by player
  const obligationsByPlayer = blockingObligations.reduce((acc, obligation) => {
    if (!acc[obligation.playerId]) {
      acc[obligation.playerId] = [];
    }
    acc[obligation.playerId].push(obligation);
    return acc;
  }, {} as Record<string, Obligation[]>);

  const waitingOnPlayerIds = Object.keys(obligationsByPlayer);
  const isWaitingOnSelf = waitingOnPlayerIds.includes(currentPlayerId);

  return (
    <TabletopModal
      title={<span className="flex items-center gap-2"><TabletopStatusIcon type="time" size={25} /> Waiting on Players</span>}
    >
        <div className="space-y-4">
          {isWaitingOnSelf && (
            <div className="rounded-lg border-2 border-[var(--ui-danger)] bg-red-950/30 p-4">
              <p className="mb-2 flex items-center gap-2 text-lg font-bold text-red-200">
                <TabletopStatusIcon type="warning" size={21} /> Everyone is waiting on you!
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Complete your pending actions before the next turn can begin.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
              Pending Obligations:
            </p>

            {waitingOnPlayerIds.map(playerId => {
              const player = gameState.players.find(p => p.id === playerId);
              const playerObligations = obligationsByPlayer[playerId];
              const isCurrentPlayer = playerId === currentPlayerId;

              return (
                <div
                  key={playerId}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentPlayer
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: player?.color || '#94a3b8' }}
                    >
                      {player?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-[var(--ui-text)]">
                      {player?.name || 'Player'}
                      {isCurrentPlayer && ' (You)'}
                    </span>
                  </div>

                  <ul className="space-y-1 ml-10">
                    {playerObligations.map((obligation, idx) => (
                      <li
                        key={idx}
                        className={`text-sm ${
                          isCurrentPlayer
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-[var(--ui-muted)]'
                        }`}
                      >
                        • {obligation.description}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <div className="flex gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-3">
            <TabletopStatusIcon type="info" size={19} className="flex-shrink-0" />
            <p className="text-xs text-[var(--ui-muted)]">
              The game is paused until all players complete their required actions. This ensures everyone&apos;s decisions are properly resolved before continuing.
            </p>
          </div>
        </div>
    </TabletopModal>
  );
}
