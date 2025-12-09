import { GameState } from '@/lib/types/game';
import { FreeRoadEffect, FreeCityWallEffect } from '../types/CardEffect';
import { addLog } from '../utilities/StateManagement';

/**
 * Effect executors for building-related card effects
 */

/**
 * Execute: Grant free road placements
 * Used by cards like Road Building, Engineer
 *
 * Note: This sets up the state for the UI to handle road placement.
 * The actual placement happens through user interaction.
 *
 * TODO: Implement pending state management when integrating with existing system
 */
export function executeFreeRoad(
  state: GameState,
  playerId: string,
  effect: FreeRoadEffect
): GameState {
  // TODO: Set up pending state for free road placement
  // This will be implemented when we integrate with the existing GameState

  addLog(
    state,
    `may place ${effect.count} free road${effect.count !== 1 ? 's' : ''}`,
    playerId
  );

  return state;
}

/**
 * Execute: Grant free city wall placements
 * Used by cards that allow building city walls
 *
 * Note: This sets up the state for the UI to handle city wall placement.
 * The actual placement happens through user interaction.
 *
 * TODO: Implement pending state management when integrating with existing system
 */
export function executeFreeCityWall(
  state: GameState,
  playerId: string,
  effect: FreeCityWallEffect
): GameState {
  // TODO: Set up pending state for free city wall placement
  // This will be implemented when we integrate with the existing GameState

  addLog(
    state,
    `may build ${effect.count} free city wall${effect.count !== 1 ? 's' : ''}`,
    playerId
  );

  return state;
}
