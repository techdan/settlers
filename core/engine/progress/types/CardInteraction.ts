import { GameState } from '@/lib/types/game';

/**
 * Types of interactions that progress cards can require from the player
 */
export type CardInteractionType =
  | 'select_resource' // Resource Monopoly - choose resource type
  | 'select_commodity' // Trade Monopoly - choose commodity type
  | 'select_vertex' // Engineer, Medicine - choose building location
  | 'select_knights' // Smith - choose up to 2 knights
  | 'select_player' // Guild Dues, Taxation - choose target player
  | 'select_edges' // Road Building - place roads
  | 'select_dice' // Alchemist - choose dice results
  | 'select_tokens' // Inventor - swap number tokens
  | 'select_cards' // Espionage - look at and take card
  | 'confirmation' // Simple yes/no confirmation
  | 'notification'; // Just show result message

export interface CardInteractionContext {
  /** Message rendered for confirmation and notification interactions */
  message?: string;

  /** Card-specific context that consumers must narrow before use */
  [key: string]: unknown;
}

/**
 * Describes the interaction required from the player
 */
export interface CardInteraction {
  /** Type of interaction needed */
  type: CardInteractionType;

  /** Name of the card being played */
  cardName: string;

  /** Prompt text to show the user */
  prompt: string;

  /** Available options for selection (if applicable) */
  options?: InteractionOption[];

  /** Minimum number of selections required */
  minSelections?: number;

  /** Maximum number of selections allowed */
  maxSelections?: number;

  /** Whether the user can cancel this interaction */
  allowCancel?: boolean;

  /** Additional context data for the interaction */
  context?: CardInteractionContext;
}

/**
 * Individual selectable option in an interaction
 */
export interface InteractionOption {
  /** Unique identifier for this option */
  id: string;

  /** Display label for the option */
  label: string;

  /** Optional description with more details */
  description?: string;

  /** Whether this option is disabled */
  disabled?: boolean;

  /** Reason why this option is disabled (shown as tooltip) */
  disabledReason?: string;

  /** Additional data for this option */
  data?: Record<string, unknown>;
}

/**
 * Result of executing a progress card
 */
export interface CardExecutionResult {
  /** Whether the card was successfully executed */
  success: boolean;

  /** Updated game state (if successful) */
  newState?: GameState;

  /** Error message (if failed) */
  error?: string;

  /** Required interaction (if card needs user input) */
  requiresInteraction?: CardInteraction;

  /** Notification to show to the user */
  notification?: CardNotification;
}

/**
 * Notification to display after card execution
 */
export interface CardNotification {
  /** Notification title */
  title: string;

  /** Notification message */
  message: string;

  /** Notification type */
  type: 'success' | 'info' | 'warning' | 'error';

  /** Duration in milliseconds (0 = manual dismiss) */
  duration?: number;
}

/**
 * User's response to a card interaction
 */
export interface CardInteractionResponse {
  /** Type of interaction being responded to */
  type: CardInteractionType;

  /** Selected option IDs */
  selections: string[];

  /** Additional data from the interaction */
  data?: Record<string, unknown>;
}
