import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';

/**
 * Diplomat Card Command
 * Politics card: Remove an open road and optionally place it as your own
 *
 * An "open road" is at the end of a road chain with no same-color pieces at that end.
 * You can only rebuild if you're removing your own road.
 *
 * Legacy implementation: executeDiplomat() (lines 1385-1458)
 */
export class DiplomatCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const edgeId = options?.edgeId as string | undefined;
    const newEdgeId = options?.newEdgeId as string | undefined;

    if (!edgeId) {
      throw new Error('Diplomat requires selecting a road to remove');
    }

    const edge = state.board.edges[edgeId];
    if (!edge || !edge.owner || edge.structure !== 'road') {
      throw new Error('Invalid edge or no road present');
    }

    const roadOwner = edge.owner;

    // Validate the road is "open"
    const { isOpenRoad } = require('@/core/validation/diplomat-validator');
    if (!isOpenRoad(state, edgeId)) {
      throw new Error(
        'Road is not "open" - must be at the end of a road chain with no same-color pieces at that end'
      );
    }

    // Can only rebuild if removing your own road
    if (newEdgeId && roadOwner !== playerId) {
      throw new Error("Cannot rebuild after removing another player's road");
    }

    // If rebuilding, validate the new location
    if (newEdgeId) {
      // Simulate the removal to check if new location is valid
      const simulatedEdges = {
        ...state.board.edges,
        [edgeId]: { ...edge, owner: null, structure: null },
      };
      const simulatedState: GameState = {
        ...state,
        board: {
          ...state.board,
          edges: simulatedEdges,
        },
      };

      const { isValidMainPhaseRoad } = require('@/core/validation/building-validator');
      if (!isValidMainPhaseRoad(simulatedState, newEdgeId, playerId)) {
        throw new Error('Invalid new edge location');
      }

      const newEdge = state.board.edges[newEdgeId];
      if (!newEdge || newEdge.owner !== null) {
        throw new Error('Invalid new edge location');
      }
    }

    // Remove the road
    edge.owner = null;
    edge.structure = null;

    // Optionally place it as player's own road
    if (newEdgeId) {
      const newEdge = state.board.edges[newEdgeId];
      if (!newEdge || newEdge.owner !== null) {
        throw new Error('Invalid new edge location');
      }

      newEdge.owner = playerId;
      newEdge.structure = 'road';

      addLog(state, 'moved their road to a new location with Diplomat', playerId);
    } else {
      addLog(state, 'removed a road (did not replace)', playerId);
    }

    return state;
  }
}
