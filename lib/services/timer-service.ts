import { GameState } from '@/lib/types/game';
import { TimerStatus, ExtensionRequestResult } from '@/lib/types/timer';

/**
 * Timer Service
 *
 * Handles all turn timer logic. All functions are pure (no side effects).
 * State mutations are returned, not applied.
 */

/**
 * Start the turn timer for the current player.
 * Should be called when phase transitions to main_phase after rolling dice.
 */
export function startTurnTimer(gameState: GameState): GameState {
  if (!gameState.timerConfig?.enabled) {
    return gameState; // Timer disabled, no-op
  }

  const now = Date.now();

  return {
    ...gameState,
    turnStartTime: now,
    turnTimeLimit: gameState.timerConfig.turnTimeLimit,
    timerLocked: false, // Reset locked state for new turn
    currentTurnExtensions: {
      count: 0,
      totalBorrowed: 0,
    },
  };
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
  const elapsedMs = now - gameState.turnStartTime;
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
export function getTimerStatus(gameState: GameState): TimerStatus {
  if (!gameState.timerConfig?.enabled || !gameState.turnStartTime) {
    return {
      isActive: false,
      startTime: 0,
      timeLimit: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      isExpired: false,
      isLocked: false,
    };
  }

  const now = Date.now();
  const elapsedMs = now - gameState.turnStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const baseLimit = gameState.timerConfig.turnTimeLimit;
  const borrowed = gameState.currentTurnExtensions?.totalBorrowed || 0;
  const effectiveLimit = baseLimit + borrowed;

  const remainingSeconds = effectiveLimit - elapsedSeconds;
  const isExpired = remainingSeconds <= 0;

  return {
    isActive: true,
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

  // Check total borrowed limit
  const newTotalBorrowed = extensions.totalBorrowed + config.extensionIncrement;
  if (newTotalBorrowed > config.maxExtraSecondsPerTurn) {
    return {
      success: false,
      error: `Maximum ${config.maxExtraSecondsPerTurn}s extra time per turn`,
    };
  }

  // Check time bank balance
  if (bank < config.extensionIncrement) {
    return {
      success: false,
      error: `Insufficient time bank (need ${config.extensionIncrement}s, have ${bank}s)`,
    };
  }

  // Grant extension
  const newBankBalance = bank - config.extensionIncrement;
  const newTimeLimit = config.turnTimeLimit + newTotalBorrowed;

  const newState: GameState = {
    ...gameState,
    currentTurnExtensions: {
      count: extensions.count + 1,
      totalBorrowed: newTotalBorrowed,
    },
    playerTimeBanks: {
      ...gameState.playerTimeBanks,
      [playerId]: newBankBalance,
    },
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
