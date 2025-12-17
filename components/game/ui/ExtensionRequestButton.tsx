'use client';

import { useState } from 'react';
import { GameState } from '@/lib/types/game';
import { formatTime } from '@/lib/hooks/useTimerState';

interface ExtensionRequestButtonProps {
  gameState: GameState;
  playerId: string;
  onRequestExtension: () => Promise<void>;
}

export function ExtensionRequestButton({
  gameState,
  playerId,
  onRequestExtension
}: ExtensionRequestButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if timer not enabled or not player's turn
  if (!gameState.timerConfig?.enabled || gameState.currentTurn !== playerId) {
    return null;
  }

  const config = gameState.timerConfig;
  const timeBank = gameState.playerTimeBanks?.[playerId] ?? 0;
  const extensions = gameState.currentTurnExtensions || { count: 0, totalBorrowed: 0 };

  // Check if extension is allowed
  const canRequest =
    extensions.count < config.maxExtensionsPerTurn &&
    extensions.totalBorrowed < config.maxExtraSecondsPerTurn &&
    timeBank >= config.extensionIncrement;

  const handleRequest = async () => {
    if (!canRequest || isRequesting) return;

    setIsRequesting(true);
    setError(null);

    try {
      await onRequestExtension();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request extension');
    } finally {
      setIsRequesting(false);
    }
  };

  // Build tooltip message
  let tooltipMessage = '';
  if (!canRequest) {
    if (extensions.count >= config.maxExtensionsPerTurn) {
      tooltipMessage = `Maximum ${config.maxExtensionsPerTurn} extensions reached`;
    } else if (extensions.totalBorrowed >= config.maxExtraSecondsPerTurn) {
      tooltipMessage = `Maximum ${formatTime(config.maxExtraSecondsPerTurn)} extra time reached`;
    } else if (timeBank < config.extensionIncrement) {
      tooltipMessage = `Insufficient time bank (need ${formatTime(config.extensionIncrement)})`;
    }
  } else {
    tooltipMessage = `Request +${formatTime(config.extensionIncrement)}? (${formatTime(timeBank)} remaining in bank)`;
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleRequest}
        disabled={!canRequest || isRequesting}
        title={tooltipMessage}
        className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
          canRequest
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
        } ${isRequesting ? 'opacity-50' : ''}`}
      >
        {isRequesting ? 'Requesting...' : `+${formatTime(config.extensionIncrement)}`}
      </button>

      {/* Extension count indicator */}
      {extensions.count > 0 && (
        <div className="text-xs text-center text-slate-600 dark:text-slate-400">
          {extensions.count}/{config.maxExtensionsPerTurn} extensions used
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tooltip on hover */}
      {canRequest && (
        <div className="text-xs text-center text-slate-500 dark:text-slate-500">
          {tooltipMessage}
        </div>
      )}
    </div>
  );
}
