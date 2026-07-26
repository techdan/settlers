'use client';

import { useState } from 'react';
import { GameState } from '@/lib/types/game';
import { formatTime } from '@/lib/hooks/useTimerState';
import { Tooltip } from '@/components/ui/tooltip';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

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

  const buttonLabel = isRequesting ? 'Requesting...' : 'More Time';
  const subLabel = `Bank: ${formatTime(timeBank)}${actualExtension > 0 ? ` | +${formatTimeWords(actualExtension)}` : ''}`;

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
      `Add ${formatTimeWords(actualExtension)} of turn time from your time bank (${formatTime(timeBank)} -> ${formatTime(newBankBalance)})`
    );
  }
  tooltipLines.push(`${extensions.count}/${config.maxExtensionsPerTurn} extensions used`);
  const tooltipMessage = tooltipLines.join('\n');

  return (
    <div className="flex flex-col items-end gap-1">
      <Tooltip
        content={tooltipMessage}
        placement="top"
        longPressDelayMs={300}
      >
        <button
          onClick={handleRequest}
          disabled={!canRequest || isRequesting}
          aria-label="Request more time"
          className={`pointer-events-auto inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 p-0 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)] ${
            canRequest
              ? 'cursor-pointer border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]'
              : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] cursor-not-allowed'
          } ${isRequesting ? 'opacity-60' : ''}`}
        >
          <TabletopStatusIcon type="time" size={34} label="Request more time" />
          <span className="sr-only">
            {buttonLabel} ({subLabel})
          </span>
        </button>
      </Tooltip>

      {/* Error message */}
      {error && (
        <div className="text-center text-xs text-[var(--ui-danger)]">
          {error}
        </div>
      )}
    </div>
  );
}
