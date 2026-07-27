import type { GameState } from '@/lib/types/game';
import type { ProgressCardCommand } from '../types/CardConfig';
import { displaceKnight } from '@/core/engine/knights/knight-manager';
import { getAdjacentEdgesForVertex } from '@/lib/hex';
import { addLog } from '../utilities/StateManagement';

interface IntrigueOptions {
  opponentId?: string;
  knightId?: string;
}

function getIntrigueOptions(options: unknown): IntrigueOptions {
  if (typeof options !== 'object' || options === null) return {};

  const candidate = options as Record<string, unknown>;
  return {
    opponentId:
      typeof candidate.opponentId === 'string'
        ? candidate.opponentId
        : undefined,
    knightId:
      typeof candidate.knightId === 'string' ? candidate.knightId : undefined,
  };
}

/**
 * Intrigue Card Command
 * Politics card: Displace any opponent's knight adjacent to one of your roads
 * Unlike normal knight displacement, Intrigue can displace ANY knight (basic, strong, OR mighty)
 *
 * Legacy implementation: executeIntrigue() (lines 1529-1577)
 */
export class IntrigueCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // C&K Rule: Knight displacement cannot occur before first barbarian attack
    if (state.gameMode === 'cities_and_knights' && !state.hasBarbariansAttacked) {
      throw new Error('Cannot displace knights before the first barbarian attack');
    }

    const { opponentId, knightId } = getIntrigueOptions(options);

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
    displaceKnight(state, knight, 'main_phase');

    addLog(
      state,
      `displaced ${opponent.name}'s ${knight.level} knight with Intrigue`,
      playerId
    );

    return state;
  }
}
