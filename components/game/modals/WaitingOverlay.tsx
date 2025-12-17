import { GameState } from '@/lib/types/game';
import { Obligation } from '@/lib/types/timer';
import { getBlockingObligations } from '@/lib/services/obligation-tracker';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">⏸️</span>
            Waiting on Players
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isWaitingOnSelf && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                🔴 Everyone is waiting on you!
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Complete your pending actions before the next turn can begin.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
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
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: player?.color || '#94a3b8' }}
                    >
                      {player?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
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
                            : 'text-slate-700 dark:text-slate-300'
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              ℹ️ The game is paused until all players complete their required actions. This ensures everyone's decisions are properly resolved before continuing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
