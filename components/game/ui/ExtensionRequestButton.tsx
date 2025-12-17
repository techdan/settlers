'use client';

import { useState } from 'react';
import { GameState } from '@/lib/types/game';
import { formatTime } from '@/lib/hooks/useTimerState';

interface ExtensionRequestButtonProps {
  gameState: GameState;
  playerId: string;
  onRequestExtension: () => Promise<void>;
}

/**
 * Format seconds as "X min Y sec" or just "X sec" for display
 */
function formatTimeWords(seconds: number): string {
  if (seconds < 0) return '0 sec';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0 && secs > 0) {
    return `${minutes} min ${secs} sec`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return `${secs} sec`;
  }
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

  // Calculate the actual extension amount
  // Use the configured increment, or whatever is left in the bank (whichever is smaller)
  const maxPossibleExtension = Math.min(
    config.extensionIncrement,
    config.maxExtraSecondsPerTurn - extensions.totalBorrowed,
    timeBank
  );

  const actualExtension = maxPossibleExtension > 0 ? maxPossibleExtension : 0;

  // Check if extension is allowed
  const canRequest =
    extensions.count < config.maxExtensionsPerTurn &&
    extensions.totalBorrowed < config.maxExtraSecondsPerTurn &&
    timeBank > 0;

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

  // Build button text and tooltip message
  const buttonText = isRequesting ? 'Requesting...' : `Request ${formatTimeWords(actualExtension)}`;

  const tooltipLines: string[] = [];
  if (!canRequest) {
    if (extensions.count >= config.maxExtensionsPerTurn) {
      tooltipLines.push(`Maximum ${config.maxExtensionsPerTurn} extensions reached`);
    } else if (extensions.totalBorrowed >= config.maxExtraSecondsPerTurn) {
      tooltipLines.push(`Maximum ${formatTime(config.maxExtraSecondsPerTurn)} extra time reached`);
    } else if (timeBank === 0) {
      tooltipLines.push('No time remaining in bank');
    }
  } else {
    const newBankBalance = timeBank - actualExtension;
    tooltipLines.push(
      `Add ${formatTimeWords(actualExtension)} of turn time from your time bank (${formatTime(timeBank)} → ${formatTime(newBankBalance)})`
    );
  }
  tooltipLines.push(`${extensions.count}/${config.maxExtensionsPerTurn} extensions used`);
  const tooltipMessage = tooltipLines.join('\n');

  return (
    <div className="space-y-1">
      <button
        onClick={handleRequest}
        disabled={!canRequest || isRequesting}
        title={tooltipMessage}
        className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
          canRequest
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg cursor-pointer'
            : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed'
        } ${isRequesting ? 'opacity-50' : ''}`}
      >
        {buttonText}
      </button>

      {/* Error message */}
      {error && (
        <div className="text-xs text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
