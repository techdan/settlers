import { GameState, TreasonEffect } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { isTreasonEffect } from '@/lib/types/effects';

/**
 * Treason Card Command
 * Politics card: Choose an opponent; they remove a knight.
 * You then place a knight of equal strength and same status on your road network.
 *
 * This creates an activeEffect (TreasonEffect) that tracks the multi-stage interaction.
 *
 * Legacy implementation: executeTreason() (lines 1490-1527)
 */

type TreasonOptions = {
  opponentId: string;
};

export class TreasonCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: TreasonOptions): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // C&K Rule: Knight-related cards cannot be played before first barbarian attack
    if (state.gameMode === 'cities_and_knights' && !state.hasBarbariansAttacked) {
      throw new Error('Cannot play Treason before the first barbarian attack');
    }

    const opponentId = options?.opponentId;
    if (!opponentId) {
      throw new Error('Treason requires selecting an opponent');
    }

    const opponent = state.players.find((p) => p.id === opponentId);
    if (!opponent) {
      throw new Error('Opponent not found');
    }

    // Validate opponent has knights
    if (!opponent.knights || opponent.knights.length === 0) {
      throw new Error('Opponent has no knights to remove');
    }

    // Initialize activeEffects array if needed
    if (!state.activeEffects) {
      state.activeEffects = [];
    }

    // Remove any prior Treason effect for this player to avoid duplicates
    state.activeEffects = state.activeEffects.filter(
      effect => !(isTreasonEffect(effect) && effect.initiatorId === playerId)
    );

    // Create new Treason effect
    const treasonEffect: TreasonEffect = {
      type: 'treason',
      initiatorId: playerId,
      targetPlayerId: opponentId,
      stage: 'awaiting_knight',
    };

    state.activeEffects.push(treasonEffect);

    addLog(
      state,
      `played Treason targeting ${opponent.name}. Waiting for knight selection`,
      playerId
    );

    return state;
  }
}
