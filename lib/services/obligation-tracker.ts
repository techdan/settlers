import { GameState } from '@/lib/types/game';
import { Obligation, ObligationCheck } from '@/lib/types/timer';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';
import { getTotalResources } from '@/core/engine/resources/resource-manager';
import { getTotalCommodities } from '@/core/engine/resources/commodity-manager';

/**
 * Obligation Tracker
 *
 * Centralizes all logic for detecting pending obligations
 * and determining if "Roll Dice" can proceed.
 */

/**
 * Check if a player needs to discard after a 7.
 */
function needsToDiscard(gameState: GameState, playerId: string): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;

  const threshold = getRobberDiscardThreshold(gameState, playerId);
  const resourceCount = getTotalResources(player);
  const commodityCount = player.commodities ? getTotalCommodities(player) : 0;
  const totalCards = resourceCount + commodityCount;

  return totalCards > threshold;
}

/**
 * Get all pending obligations in the game.
 */
export function getAllPendingObligations(gameState: GameState): Obligation[] {
  const obligations: Obligation[] = [];

  // 1. Discard after rolling a 7
  if (gameState.phase === 'discarding') {
    gameState.players.forEach(player => {
      if (needsToDiscard(gameState, player.id)) {
        obligations.push({
          type: 'discard_after_seven',
          playerId: player.id,
          description: `${player.name} must discard to 7 cards`,
          isBlocking: true,
          isDependency: true, // Blocks robber placement
        });
      }
    });
  }

  // 2. Robber placement (after discards complete)
  if (gameState.phase === 'robber_placement') {
    const player = gameState.players.find(p => p.id === gameState.currentTurn);
    obligations.push({
      type: 'robber_placement',
      playerId: gameState.currentTurn,
      description: `${player?.name || 'Player'} must place the robber`,
      isBlocking: true,
      isDependency: false, // Required action by current player
    });
  }

  // 3. Robber steal
  if (gameState.phase === 'stealing') {
    const player = gameState.players.find(p => p.id === gameState.currentTurn);
    obligations.push({
      type: 'robber_steal',
      playerId: gameState.currentTurn,
      description: `${player?.name || 'Player'} must steal from a player`,
      isBlocking: true,
      isDependency: false,
    });
  }

  // 4. Aqueduct selections
  if (gameState.pendingAqueduct && gameState.pendingAqueduct.length > 0) {
    gameState.pendingAqueduct.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'aqueduct_selection',
        playerId,
        description: `${player?.name || 'Player'} must select aqueduct resource`,
        isBlocking: true,
        isDependency: false, // Async obligation
      });
    });
  }

  // 5. Commercial Harbor responses
  if (gameState.pendingCommercialHarbor) {
    const pendingOffers = gameState.pendingCommercialHarbor.offers.filter(
      offer => offer.offeredResource !== null && offer.response === undefined
    );

    pendingOffers.forEach(offer => {
      const player = gameState.players.find(p => p.id === offer.targetPlayerId);
      obligations.push({
        type: 'commercial_harbor_response',
        playerId: offer.targetPlayerId,
        description: `${player?.name || 'Player'} must respond to trade offer`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 6. Wedding gifts
  if (gameState.pendingWedding) {
    const pendingGifts = gameState.pendingWedding.requests.filter(
      request => request.status === 'pending'
    );

    pendingGifts.forEach(request => {
      const player = gameState.players.find(p => p.id === request.playerId);
      obligations.push({
        type: 'wedding_gift',
        playerId: request.playerId,
        description: `${player?.name || 'Player'} must select wedding gift`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 7. Barbarian city selection
  if (gameState.pendingBarbarianVictims && gameState.pendingBarbarianVictims.length > 0) {
    gameState.pendingBarbarianVictims.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'barbarian_city_selection',
        playerId,
        description: `${player?.name || 'Player'} must choose city to lose`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 8. Knight displacement
  if (gameState.pendingDisplacement) {
    const player = gameState.players.find(
      p => p.id === gameState.pendingDisplacement?.playerId
    );
    obligations.push({
      type: 'knight_displacement',
      playerId: gameState.pendingDisplacement.playerId,
      description: `${player?.name || 'Player'} must move displaced knight`,
      isBlocking: true,
      isDependency: false,
    });
  }

  // 9. Defender card draws (rare case where multiple players draw simultaneously)
  if (gameState.pendingDefenderCardDraws && gameState.pendingDefenderCardDraws.length > 0) {
    gameState.pendingDefenderCardDraws.forEach(playerId => {
      const player = gameState.players.find(p => p.id === playerId);
      obligations.push({
        type: 'defender_card_draw',
        playerId,
        description: `${player?.name || 'Player'} must draw defender card`,
        isBlocking: true,
        isDependency: false,
      });
    });
  }

  // 10. Progress card over limit (player must play or discard)
  gameState.players.forEach(player => {
    if (player.progressCards && player.progressCards.length > 4) {
      obligations.push({
        type: 'progress_card_over_limit',
        playerId: player.id,
        description: `${player.name} must play or discard progress cards`,
        isBlocking: true,
        isDependency: false,
      });
    }
  });

  return obligations;
}

/**
 * Check if "Roll Dice" can proceed.
 *
 * Returns:
 * - canRollDice: true if allowed
 * - blockedBy: array of blocking obligations
 * - waitingOn: array of player IDs who must act
 */
export function canRollDice(gameState: GameState): ObligationCheck {
  const obligations = getAllPendingObligations(gameState);

  // Any blocking obligation prevents roll
  const blockingObligations = obligations.filter(o => o.isBlocking);

  return {
    canRollDice: blockingObligations.length === 0,
    blockedBy: blockingObligations,
    waitingOn: [...new Set(blockingObligations.map(o => o.playerId))],
  };
}

/**
 * Get a human-readable summary of obligations for a specific player.
 */
export function getObligationSummary(gameState: GameState, playerId: string): string {
  const obligations = getAllPendingObligations(gameState);
  const playerObligations = obligations.filter(o => o.playerId === playerId);

  if (playerObligations.length === 0) {
    return 'No pending obligations';
  }

  return playerObligations.map(o => o.description).join('; ');
}

/**
 * Get obligations blocking a specific player from continuing.
 * Used to show "waiting on" messages.
 */
export function getBlockingObligations(gameState: GameState): Obligation[] {
  const obligations = getAllPendingObligations(gameState);
  return obligations.filter(o => o.isBlocking);
}
