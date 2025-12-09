import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ResourceType } from '@/core/rules/board-constants';

/**
 * Medicine Card Command
 * Science card: Upgrade a settlement to a city for 2 ore + 1 wheat (discounted)
 *
 * Legacy implementation: executeMedicine() (lines 654-696)
 */
export class MedicineCommand implements ProgressCardCommand {
  private static readonly MEDICINE_COST: Partial<Record<ResourceType, number>> = {
    ore: 2,
    wheat: 1,
  };

  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const vertexId = options?.vertexId as string | undefined;
    if (!vertexId) {
      throw new Error('Medicine requires selecting one of your settlements');
    }

    // Validate the settlement can be upgraded
    const { isValidMainPhaseCity } = require('@/core/validation/building-validator');
    if (!isValidMainPhaseCity(state, vertexId, playerId)) {
      throw new Error('Selected location is not an eligible settlement for Medicine');
    }

    const vertex = state.board.vertices[vertexId];
    if (!vertex) {
      throw new Error('Invalid city selection for Medicine');
    }

    // Deduct resources
    const { removeResources } = require('@/core/engine/resources/resource-manager');
    removeResources(player, MedicineCommand.MEDICINE_COST);

    // Upgrade settlement to city
    player.citiesRemaining = Math.max(0, (player.citiesRemaining || 0) - 1);
    player.settlementsRemaining = (player.settlementsRemaining || 0) + 1;
    vertex.structure = 'city';

    // Update victory points
    const { updateAllVictoryPoints, checkVictoryCondition } = require('@/core/rules/victory-conditions');
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
