import { GameState } from '@/lib/types/game';
import { ProgressCardType } from '@/lib/types/player';
import { CardEffect } from './CardEffect';

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

  /** List of effects to apply when the card is played */
  effects: CardEffect[];

  /** Optional custom validation function */
  validator?: (state: GameState, playerId: string) => boolean;
}

/**
 * Interface for complex progress card commands
 * These cards have custom logic that doesn't fit the declarative model
 */
export interface ProgressCardCommand {
  /** Card type identifier */
  readonly type: ProgressCardType;

  /** Card category */
  readonly category: 'science' | 'trade' | 'politics';

  /** Whether this card grants a victory point */
  readonly isVictoryPoint: boolean;

  /** Check if the card can be executed in the current state */
  canExecute(state: GameState, playerId: string): boolean;

  /** Execute the card's logic */
  execute(state: GameState, playerId: string, options?: any): GameState;
}
