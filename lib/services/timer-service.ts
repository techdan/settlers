import { GameState, GamePhase } from '@/lib/types/game';
import { TimerStatus, ExtensionRequestResult } from '@/lib/types/timer';
import { getAllPendingObligations } from '@/lib/services/obligation-tracker';

/**
 * Timer Service
 *
 * Handles all turn timer logic. Calculations are pure; timer transition
 * helpers mutate and return the game state to match the existing service
 * mutation pattern.
 */

/**
 * Format seconds as MM:SS or HH:MM:SS.
 *
 * Shared with the HUD (re-exported from lib/hooks/useTimerState) so the game
 * log reports extensions in the same clock format the player just read off
 * their time bank.
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Return the amount of time that has elapsed while the active player was
 * actually able to act. The current open pause is included so this helper is
 * also safe to use before the next state write closes the pause.
 */
function getActiveElapsedMs(gameState: GameState, now: number): number {
  if (!gameState.turnStartTime) return 0;

  const pausedDurationMs =
    (gameState.turnPausedDurationMs ?? 0) +
    (gameState.turnPausedAt === undefined
      ? 0
      : Math.max(0, now - gameState.turnPausedAt));

  return Math.max(0, now - gameState.turnStartTime - pausedDurationMs);
}

/**
 * Another player's unresolved obligation pauses the active player's timer.
 * Obligations belonging to the active player do not pause their clock: they
 * still have a required action they can complete themselves.
 */
export function isWaitingForOtherPlayers(gameState: GameState): boolean {
  return getAllPendingObligations(gameState).some(
    obligation => obligation.isBlocking && obligation.playerId !== gameState.currentTurn
  );
}

/** Mark the active turn timer as paused, preserving the already elapsed time. */
export function pauseTurnTimer(gameState: GameState, now: number = Date.now()): GameState {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return gameState;
  }

  if (gameState.turnPausedAt === undefined) {
    gameState.turnPausedAt = now;
  }
  gameState.turnPausedDurationMs ??= 0;

  return gameState;
}

/** Resume a paused timer and add the completed pause to its active-time total. */
export function resumeTurnTimer(gameState: GameState, now: number = Date.now()): GameState {
  if (gameState.turnPausedAt === undefined) {
    return gameState;
  }

  gameState.turnPausedDurationMs =
    (gameState.turnPausedDurationMs ?? 0) + Math.max(0, now - gameState.turnPausedAt);
  gameState.turnPausedAt = undefined;

  return gameState;
}

/**
 * Reconcile the timer with the current game's obligations before persisting a
 * state update. This keeps pause accounting authoritative and covers actions
 * that resolve obligations without going through a phase helper.
 */
export function syncTurnTimerPause(gameState: GameState, now: number = Date.now()): GameState {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return gameState;
  }

  if (isWaitingForOtherPlayers(gameState)) {
    return pauseTurnTimer(gameState, now);
  }

  return resumeTurnTimer(gameState, now);
}

/**
 * Centralized phase transition helper.
 * Automatically starts the timer when entering main_phase.
 *
 * Use this instead of directly setting gameState.phase to ensure
 * the timer is started consistently across all code paths.
 *
 * @param gameState Current game state
 * @param newPhase The phase to transition to
 * @returns Updated game state with new phase and timer started if applicable
 */
export function setPhase(gameState: GameState, newPhase: GamePhase): GameState {
  gameState.phase = newPhase;

  // Automatically start timer when entering main_phase
  // startTurnTimer is idempotent, so safe to call multiple times
  if (newPhase === 'main_phase') {
    gameState = startTurnTimer(gameState);
  }

  // Phase changes can resolve a pending obligation immediately. Reconcile
  // here as well as at the persistence boundary for callers that use this
  // helper directly.
  gameState = syncTurnTimerPause(gameState);

  return gameState;
}

/**
 * Start the turn timer for the current player.
 * Should be called when phase transitions to main_phase after rolling dice.
 *
 * This function is idempotent - it will not restart a timer that's already running.
 * Mutates gameState in place for consistency with the codebase's mutation pattern.
 */
export function startTurnTimer(gameState: GameState): GameState {
  if (!gameState.timerConfig?.enabled) {
    return gameState; // Timer disabled, no-op
  }

  // Idempotent: don't restart if timer is already running
  if (gameState.turnStartTime) {
    return gameState;
  }

  const now = Date.now();

  // Mutate in place for consistency with codebase patterns
  gameState.turnStartTime = now;
  gameState.turnPausedAt = undefined;
  gameState.turnPausedDurationMs = 0;
  gameState.turnTimeLimit = gameState.timerConfig.turnTimeLimit;
  gameState.timerLocked = false; // Reset locked state for new turn
  gameState.currentTurnExtensions = {
    count: 0,
    totalBorrowed: 0,
  };

  return gameState;
}

/**
 * Stop the turn timer and update time banks.
 * Should be called when turn ends.
 *
 * Returns updated game state with:
 * - Player's time bank adjusted (refund if time left)
 * - Player's total time incremented
 * - Turn start time cleared
 */
export function stopTurnTimer(
  gameState: GameState,
  playerId: string
): GameState {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return gameState; // Timer not active
  }

  const now = Date.now();
  const elapsedMs = getActiveElapsedMs(gameState, now);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Calculate refund
  const baseLimit = gameState.timerConfig.turnTimeLimit;
  const borrowed = gameState.currentTurnExtensions?.totalBorrowed || 0;
  const effectiveLimit = baseLimit + borrowed;
  const unusedTime = Math.max(0, effectiveLimit - elapsedSeconds);

  // Refund only applies to borrowed time
  const refund = Math.min(unusedTime, borrowed);

  // Update time bank
  const currentBank = gameState.playerTimeBanks?.[playerId] || 0;
  const newBank = currentBank + refund;

  // Update total time played
  // Cap at effectiveLimit - overtime doesn't count toward gameplay time
  const countedTime = Math.min(elapsedSeconds, effectiveLimit);
  const currentTotal = gameState.playerTotalTime?.[playerId] || 0;
  const newTotal = currentTotal + countedTime;

  return {
    ...gameState,
    turnStartTime: undefined,
    turnPausedAt: undefined,
    turnPausedDurationMs: undefined,
    turnTimeLimit: undefined,
    timerLocked: false,
    currentTurnExtensions: undefined,
    playerTimeBanks: {
      ...gameState.playerTimeBanks,
      [playerId]: newBank,
    },
    playerTotalTime: {
      ...gameState.playerTotalTime,
      [playerId]: newTotal,
    },
  };
}

/**
 * Check if the current turn timer has expired.
 */
export function checkTimeout(gameState: GameState): boolean {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return false;
  }

  const status = getTimerStatus(gameState);
  return status.isExpired;
}

/**
 * Get the current timer status (for UI display).
 * This is a pure function that calculates status from server timestamps.
 */
export function getTimerStatus(
  gameState: GameState,
  now: number = Date.now() - (gameState.timerClockOffsetMs ?? 0)
): TimerStatus {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return {
      isActive: false,
      isPaused: false,
      startTime: 0,
      timeLimit: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      isExpired: false,
      isLocked: false,
    };
  }

  const elapsedMs = getActiveElapsedMs(gameState, now);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const baseLimit = gameState.timerConfig.turnTimeLimit;
  const borrowed = gameState.currentTurnExtensions?.totalBorrowed || 0;
  const effectiveLimit = baseLimit + borrowed;

  const remainingSeconds = effectiveLimit - elapsedSeconds;
  const isExpired = remainingSeconds <= 0;

  return {
    isActive: true,
    isPaused: gameState.turnPausedAt !== undefined,
    startTime: gameState.turnStartTime,
    timeLimit: effectiveLimit,
    timeElapsed: elapsedSeconds,
    timeRemaining: Math.max(0, remainingSeconds),
    isExpired,
    isLocked: isExpired || gameState.timerLocked === true,
  };
}

/**
 * Request a time extension.
 *
 * Returns:
 * - { success: true, newState, newTimeLimit, newBankBalance } if allowed
 * - { success: false, error } if not allowed
 */
export function requestExtension(
  gameState: GameState,
  playerId: string
): ExtensionRequestResult & { newState?: GameState } {
  if (!gameState.timerConfig?.enabled) {
    return { success: false, error: 'Timer not enabled' };
  }

  if (gameState.currentTurn !== playerId) {
    return { success: false, error: 'Not your turn' };
  }

  const config = gameState.timerConfig;
  const extensions = gameState.currentTurnExtensions || { count: 0, totalBorrowed: 0 };
  const bank = gameState.playerTimeBanks?.[playerId] || 0;

  // Check extension count limit
  if (extensions.count >= config.maxExtensionsPerTurn) {
    return {
      success: false,
      error: `Maximum ${config.maxExtensionsPerTurn} extensions per turn`,
    };
  }

  // Check time bank balance
  if (bank === 0) {
    return {
      success: false,
      error: 'No time remaining in bank',
    };
  }

  // Calculate actual extension amount
  // Use the configured increment, or whatever is available (whichever is smaller)
  const maxAllowedByLimit = config.maxExtraSecondsPerTurn - extensions.totalBorrowed;
  const actualExtension = Math.min(
    config.extensionIncrement,
    maxAllowedByLimit,
    bank
  );

  if (actualExtension <= 0) {
    return {
      success: false,
      error: `Maximum ${config.maxExtraSecondsPerTurn}s extra time per turn`,
    };
  }

  // Grant extension
  const newTotalBorrowed = extensions.totalBorrowed + actualExtension;
  const newBankBalance = bank - actualExtension;

  // When granting an extension, we need to prevent "time leakage" where seconds spent
  // after the timer expires eat into the extension. We do this by adjusting the turn
  // start time backward to ensure the player gets the full extension amount.
  const now = Date.now();
  const currentElapsed = getTimerStatus(gameState, now).timeElapsed;
  const currentLimit = config.turnTimeLimit + extensions.totalBorrowed;

  // If the timer has expired, calculate how much overtime has passed
  const overtime = Math.max(0, currentElapsed - currentLimit);

  // Adjust the turn start time forward by the overtime amount, effectively "forgiving"
  // the time spent after expiry and giving the player the full extension
  const adjustedStartTime = (gameState.turnStartTime || now) + (overtime * 1000);

  const newTimeLimit = config.turnTimeLimit + newTotalBorrowed;

  // Borrowing time is a public act that changes the pace of the game, so it
  // belongs in the log alongside rolls and builds. Built as a new array rather
  // than pushed, because this function must not mutate the state it was given.
  const playerName = gameState.players.find(p => p.id === playerId)?.name;
  const logMessage = playerName
    ? `${playerName} extended their turn by ${formatTime(actualExtension)} from the time bank (${formatTime(bank)} -> ${formatTime(newBankBalance)}).`
    : `A player extended their turn by ${formatTime(actualExtension)} from the time bank.`;

  const newState: GameState = {
    ...gameState,
    turnStartTime: adjustedStartTime,
    turnTimeLimit: newTimeLimit,
    currentTurnExtensions: {
      count: extensions.count + 1,
      totalBorrowed: newTotalBorrowed,
    },
    playerTimeBanks: {
      ...gameState.playerTimeBanks,
      [playerId]: newBankBalance,
    },
    logs: [
      ...(gameState.logs ?? []),
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: logMessage,
        playerId,
      },
    ],
    // Clear the locked state when extension is granted
    timerLocked: false,
  };

  return {
    success: true,
    newState,
    newTimeLimit,
    newBankBalance
  };
}

/**
 * Check if a player can perform an optional action.
 *
 * Returns false if turn is timed out (locked state).
 */
export function canPerformOptionalAction(
  gameState: GameState,
  playerId: string
): boolean {
  if (gameState.currentTurn !== playerId) {
    return false; // Not their turn
  }

  if (!gameState.timerConfig?.enabled) {
    return true; // Timer disabled, always allowed
  }

  const status = getTimerStatus(gameState);
  return !status.isLocked;
}

/**
 * Check if the current player can end their turn.
 *
 * Even in locked state, player can end turn (required action).
 */
export function canEndTurn(gameState: GameState, playerId: string): boolean {
  // Timer doesn't block ending turn - that's enforced by obligation checks
  return gameState.currentTurn === playerId;
}

/**
 * Helper to enforce timeout by setting timerLocked flag.
 * Call this at the start of every game action (check-on-action pattern).
 *
 * @returns Updated game state with timerLocked set if expired
 */
export function enforceTimeout(gameState: GameState): GameState {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return gameState;
  }

  const isExpired = checkTimeout(gameState);

  if (isExpired && !gameState.timerLocked) {
    return {
      ...gameState,
      timerLocked: true,
    };
  }

  return gameState;
}
