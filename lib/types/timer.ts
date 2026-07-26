/**
 * Timer Configuration and State Types
 *
 * These types support the turn timer feature, which adds lobby-configured
 * time limits with per-player time banks, extensions, and obligation gating.
 */

/**
 * Timer configuration (set in lobby, copied to game state)
 */
export interface TimerConfig {
  enabled: boolean;              // Is timer feature turned on?
  turnTimeLimit: number;         // Seconds per turn (default: 180)
  timeBank: number;              // Per-player bank in seconds (default: 300)
  extensionIncrement: number;    // Seconds per extension request (default: 60)
  maxExtensionsPerTurn: number;  // Max extensions per turn (default: 2)
  maxExtraSecondsPerTurn: number; // Max total extension per turn (default: 180)
}

/**
 * Default timer configuration
 */
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  enabled: false,  // Opt-in
  turnTimeLimit: 120,
  timeBank: 300,
  extensionIncrement: 60,
  maxExtensionsPerTurn: 2,
  maxExtraSecondsPerTurn: 180,
};

/**
 * Timer presets for lobby configuration
 */
export const TIMER_PRESETS = [
  { label: '1m', value: 60 },
  { label: '1.5m', value: 90 },
  { label: '2m (Default)', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: 'Custom', value: -1 },
] as const;

/**
 * Timer status (client-side calculated from server timestamps)
 */
export interface TimerStatus {
  isActive: boolean;           // Is timer currently running?
  startTime: number;           // When timer started (ms)
  timeLimit: number;           // Total time allowed (seconds)
  timeElapsed: number;         // Seconds elapsed
  timeRemaining: number;       // Seconds remaining (can be negative)
  isExpired: boolean;          // Has timer run out?
  isLocked: boolean;           // Are optional actions locked?
}

/**
 * Time bank status for a player
 */
export interface TimeBank {
  playerId: string;
  remaining: number;           // Seconds left in bank
  used: number;                // Total seconds used this game
}

/**
 * Pending obligation that must be resolved
 */
export interface Obligation {
  type: ObligationType;
  playerId: string;           // Who must act
  description: string;        // Human-readable summary
  isBlocking: boolean;        // Does it block roll dice?
  isDependency: boolean;      // Does it block current player's decisions?
}

/**
 * Types of obligations that can block game progress
 */
export type ObligationType =
  | 'discard_after_seven'
  | 'robber_placement'
  | 'robber_steal'
  | 'aqueduct_selection'
  | 'commercial_harbor_response'
  | 'wedding_gift'
  | 'barbarian_city_selection'
  | 'knight_displacement'
  | 'defender_card_draw'
  | 'alchemy_dice_selection'
  | 'progress_card_over_limit';

/**
 * Result of checking if Roll Dice is allowed
 */
export interface ObligationCheck {
  canRollDice: boolean;
  blockedBy: Obligation[];     // List of blocking obligations
  waitingOn: string[];         // Player IDs who must act
}

/**
 * Extension tracking for current turn
 */
export interface TurnExtensionTracking {
  count: number;                // Extensions requested this turn
  totalBorrowed: number;        // Total seconds borrowed this turn
}

/**
 * Extension request result
 */
export interface ExtensionRequestResult {
  success: boolean;
  newTimeLimit?: number;
  newBankBalance?: number;
  error?: string;
}
