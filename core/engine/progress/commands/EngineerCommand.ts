import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { getCityWallCount } from '@/core/utils/city-wall-utils';

/**
 * Engineer Card Command (a.k.a. "Engineering")
 * Science card: Build one city wall for free
 *
 * Legacy implementation: executeEngineer() (lines 607-631)
 */
export class EngineerCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const vertexId = options?.vertexId as string | undefined;
    if (!vertexId) {
      throw new Error('Engineering requires selecting a city without a wall');
    }

    // Validate the city wall placement
    if (!canBuildCityWall(state, vertexId, playerId, { ignoreCost: true })) {
      throw new Error('Selected city is not eligible for a city wall');
    }

    const vertex = state.board.vertices[vertexId];
    if (!vertex) {
      throw new Error('Invalid city selection for Engineering');
    }

    // Build the wall
    const currentWallCount = getCityWallCount(state, playerId);
    vertex.hasCityWall = true;

    addLog(
      state,
      `built a city wall for free with Engineering (${currentWallCount + 1}/3)`,
      playerId
    );

    return state;
  }
}
