import type { GameState } from '@/lib/types/game';
import type { ProgressCardCommand } from '../types/CardConfig';
import { removeResources } from '@/core/engine/resources/resource-manager';
import { addLog } from '../utilities/StateManagement';
import { MEDICINE_COST } from '@/core/rules/commodity-constants';
import {
  checkVictoryCondition,
  updateAllVictoryPoints,
} from '@/core/rules/victory-conditions';
import { isValidMainPhaseCity } from '@/core/validation/building-validator';

function getMedicineVertexId(options: unknown): string | undefined {
  if (typeof options !== 'object' || options === null) return undefined;

  const vertexId = (options as Record<string, unknown>).vertexId;
  return typeof vertexId === 'string' ? vertexId : undefined;
}

/**
 * Medicine Card Command
 * Science card: Upgrade a settlement to a city for 2 ore + 1 wheat (discounted)
 *
 * Legacy implementation: executeMedicine() (lines 654-696)
 */
export class MedicineCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const vertexId = getMedicineVertexId(options);
    if (!vertexId) {
      throw new Error('Medicine requires selecting one of your settlements');
    }

    // Validate the settlement can be upgraded
    if (!isValidMainPhaseCity(state, vertexId, playerId)) {
      throw new Error('Selected location is not an eligible settlement for Medicine');
    }

    const vertex = state.board.vertices[vertexId];
    if (!vertex) {
      throw new Error('Invalid city selection for Medicine');
    }

    // Deduct resources
    removeResources(player, MEDICINE_COST);

    // Upgrade settlement to city
    player.citiesRemaining = Math.max(0, (player.citiesRemaining || 0) - 1);
    player.settlementsRemaining = (player.settlementsRemaining || 0) + 1;
    vertex.structure = 'city';

    // Update victory points
    updateAllVictoryPoints(state);

    addLog(
      state,
      'upgraded a settlement to a city with Medicine (2 ore + 1 wheat)',
      playerId
    );

    // Check for victory
    const winnerId = checkVictoryCondition(state);
    if (winnerId) {
      state.winner = winnerId;
      state.phase = 'game_over';

      const winner = state.players.find((p) => p.id === winnerId);
      addLog(state, `${winner?.name} wins with ${winner?.victoryPoints} victory points!`);
    }

    return state;
  }
}
