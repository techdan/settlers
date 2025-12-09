import { GameState } from '@/lib/types/game';
import {
  UpgradeKnightEffect,
  ActivateKnightEffect,
  PromoteKnightEffect,
} from '../types/CardEffect';
import { addLog } from '../utilities/StateManagement';
import { getPlayerKnights } from '../utilities/BoardScanning';

/**
 * Effect executors for knight-related card effects
 */

/**
 * Execute: Grant free knight strength upgrades
 * Used by cards like Smith
 *
 * Note: This sets up the state for the UI to handle knight selection.
 * The actual upgrade happens through user interaction.
 *
 * TODO: Implement pending state management when integrating with existing system
 */
export function executeUpgradeKnight(
  state: GameState,
  playerId: string,
  effect: UpgradeKnightEffect
): GameState {
  // TODO: Set up pending state for free knight upgrades
  // This will be implemented when we integrate with the existing GameState

  addLog(
    state,
    `may upgrade ${effect.freeUpgrades} knight${
      effect.freeUpgrades !== 1 ? 's' : ''
    } for free`,
    playerId
  );

  return state;
}

/**
 * Execute: Grant free knight activations
 * Used by cards that allow activating knights without commodity cost
 *
 * Note: This sets up the state for the UI to handle knight selection.
 * The actual activation happens through user interaction.
 *
 * TODO: Implement pending state management when integrating with existing system
 */
export function executeActivateKnight(
  state: GameState,
  playerId: string,
  effect: ActivateKnightEffect
): GameState {
  // TODO: Set up pending state for free knight activations
  // This will be implemented when we integrate with the existing GameState

  addLog(
    state,
    `may activate ${effect.freeActivations} knight${
      effect.freeActivations !== 1 ? 's' : ''
    } for free`,
    playerId
  );

  return state;
}

/**
 * Execute: Grant free knight promotions
 * Used by cards that allow promoting knights to next level
 *
 * Note: This sets up the state for the UI to handle knight selection.
 * The actual promotion happens through user interaction.
 *
 * TODO: Implement pending state management when integrating with existing system
 */
export function executePromoteKnight(
  state: GameState,
  playerId: string,
  effect: PromoteKnightEffect
): GameState {
  // TODO: Set up pending state for free knight promotions
  // This will be implemented when we integrate with the existing GameState

  addLog(
    state,
    `may promote ${effect.freePromotions} knight${
      effect.freePromotions !== 1 ? 's' : ''
    } for free`,
    playerId
  );

  return state;
}

/**
 * Helper: Get count of knights eligible for upgrade (basic or strong)
 */
export function getUpgradeableKnights(state: GameState, playerId: string) {
  const knights = getPlayerKnights(state, playerId);
  return knights.filter((knight) => {
    // Knights can be upgraded if they're basic or strong (not mighty)
    return knight.level === 'basic' || knight.level === 'strong';
  });
}

/**
 * Helper: Get count of knights eligible for activation
 */
export function getActivatableKnights(state: GameState, playerId: string) {
  const knights = getPlayerKnights(state, playerId);
  return knights.filter((knight) => {
    // Only inactive knights can be activated
    return !knight.active;
  });
}

/**
 * Helper: Get count of knights eligible for promotion (basic or strong)
 */
export function getPromotableKnights(state: GameState, playerId: string) {
  const knights = getPlayerKnights(state, playerId);
  return knights.filter((knight) => {
    // Knights can be promoted if they're basic or strong (not mighty)
    return knight.level === 'basic' || knight.level === 'strong';
  });
}
