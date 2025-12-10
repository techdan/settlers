import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Intrigue Card Command
 * Politics card: Displace any opponent's knight adjacent to one of your roads
 * Unlike normal knight displacement, Intrigue can displace ANY knight (basic, strong, OR mighty)
 *
 * Legacy implementation: executeIntrigue() (lines 1529-1577)
 */
export class IntrigueCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // C&K Rule: Knight displacement cannot occur before first barbarian attack
    if (state.gameMode === 'cities_and_knights' && !state.hasBarbariansAttacked) {
      throw new Error('Cannot displace knights before the first barbarian attack');
    }

    const opponentId = options?.opponentId as string | undefined;
    const knightId = options?.knightId as string | undefined;

    if (!opponentId || !knightId) {
      throw new Error('Intrigue requires selecting an opponent and a knight');
    }

    const opponent = state.players.find((p) => p.id === opponentId);
    if (!opponent) {
      throw new Error('Opponent not found');
    }

    if (!opponent.knights || opponent.knights.length === 0) {
      throw new Error('Opponent has no knights');
    }

    const knight = opponent.knights.find((k) => k.id === knightId);
    if (!knight) {
      throw new Error('Knight not found');
    }

    // Validate the knight is on an intersection connected to one of player's roads
    const knightVertexId = knight.vertexId;
    const [q, r, d] = knightVertexId.split(',').map(Number);

    // Get all edges adjacent to the knight's vertex
    const { getAdjacentEdgesForVertex } = require('@/lib/hex');
    const adjacentEdges = getAdjacentEdgesForVertex(q, r, d);

    // Check if any of these edges are owned by the player
    let hasAdjacentRoute = false;
    for (const edgeId of adjacentEdges) {
      const edge = state.board.edges[edgeId];
      if (edge && edge.owner === playerId && edge.structure === 'road') {
        hasAdjacentRoute = true;
        break;
      }
    }

    if (!hasAdjacentRoute) {
      throw new Error('Knight must be on an intersection connected to one of your routes');
    }

    // Displace the knight
    const { displaceKnight } = require('@/core/engine/knights/knight-manager');
    displaceKnight(state, knight, 'main_phase');

    addLog(
      state,
      `displaced ${opponent.name}'s ${knight.level} knight with Intrigue`,
      playerId
    );

    return state;
  }
}
