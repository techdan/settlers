import { GameState } from '@/lib/types/game';
import { ProgressCardType } from '@/lib/types/player';
import { CardEffect } from './CardEffect';
import { CardInteraction } from './CardInteraction';

/**
 * Configuration for a simple progress card
 * These cards are executed via declarative effects rather than custom code
 */
export interface CardConfig {
  /** Card type identifier */
  type: ProgressCardType;

  /** Card category */
  category: 'science' | 'trade' | 'politics';

  /** Whether this card grants a victory point */
  isVictoryPoint: boolean;

  /** Whether the card requires user interaction/selection */
  requiresInteraction: boolean;

  /**
   * Interaction requirements (if requiresInteraction is true)
   * This declares upfront what the user needs to select
   */
  interaction?: Omit<CardInteraction, 'cardName'>;

  /** List of effects to apply when the card is played */
  effects: CardEffect[];

  /** Optional custom validation function */
  validator?: (state: GameState, playerId: string) => boolean;
}

/**
 * Interface for complex progress card commands
 * These cards have custom logic that doesn't fit the declarative model
 *
 * Commands should throw errors if they cannot execute (e.g., validation failures)
 */
export interface ProgressCardCommand {
  /** Execute the card's logic */
  execute(state: GameState, playerId: string, options?: unknown): GameState;
}
