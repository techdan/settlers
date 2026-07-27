import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { isRoadBuildingEffect } from '@/lib/types/effects';

/**
 * Road Building Card Command
 * Science card: Build two roads for free
 *
 * Legacy implementation: executeRoadBuilding() (lines 633-652)
 *
 * Note: This card works differently - it sets up an active effect that allows
 * the player to place 2 roads through the normal road placement UI.
 */
export class RoadBuildingCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: unknown): GameState {
    void options;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Initialize activeEffects if needed
    if (!state.activeEffects) {
      state.activeEffects = [];
    }

    // Clear any prior progress-card road building effect for this player
    state.activeEffects = state.activeEffects.filter(
      effect => !(isRoadBuildingEffect(effect) && effect.playerId === playerId)
    );

    // Add the road building effect
    state.activeEffects.push({
      type: 'road_building_progress',
      playerId: playerId,
      placedEdges: [] as string[],
      completed: false,
    });

    // Set phase to road_building_1
    state.phase = 'road_building_1';

    return state;
  }
}
