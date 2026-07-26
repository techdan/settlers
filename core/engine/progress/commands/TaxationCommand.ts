import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { ResourceType } from '@/core/rules/board-constants';
import { getVertexIdsForHex } from '@/core/engine/progress/utilities/BoardScanning';
import { addResources } from '@/core/engine/resources/resource-manager';
import { stealRandomResource } from '@/core/engine/progress/utilities/ResourceTransfer';

/**
 * Taxation Card Command
 * Politics card: Move robber and steal 1 random resource from each opponent on the hex
 *
 * Legacy implementation: executeTaxation() (lines 1579-1658)
 */
export class TaxationCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const hexId = options?.hexId as string | undefined;
    if (!hexId) {
      throw new Error('Taxation requires selecting a hex to move the robber');
    }

    // C&K Rule: Robber cannot move before first barbarian attack
    if (state.gameMode === 'cities_and_knights' && !state.hasBarbariansAttacked) {
      throw new Error('Cannot move the robber before the first barbarian attack');
    }

    const hex = state.board.hexes.find((h) => h.id === hexId);
    if (!hex) {
      throw new Error('Invalid hex selection');
    }

    // Move robber
    state.robberHexId = hexId;

    // Find all opponents with settlements/cities on this hex
    const adjacentVertices = getVertexIdsForHex(hexId);
    const opponentsOnHex = new Set<string>();

    for (const vertexId of adjacentVertices) {
      const vertex = state.board.vertices[vertexId];
      if (vertex && vertex.owner && vertex.owner !== playerId && vertex.structure) {
        opponentsOnHex.add(vertex.owner);
      }
    }

    // Steal 1 random resource from each opponent
    const theftVictims: { victimId: string; resource: ResourceType }[] = [];
    for (const opponentId of opponentsOnHex) {
      const opponent = state.players.find((p) => p.id === opponentId);
      if (!opponent) continue;

      const stolenResource = stealRandomResource(opponent);
      if (stolenResource) {
        addResources(player, { [stolenResource]: 1 });
        theftVictims.push({ victimId: opponentId, resource: stolenResource });
      }
    }

    // Update theft tracking
    if (theftVictims.length > 0) {
      state.lastTheft = {
        victimId: theftVictims.length === 1 ? theftVictims[0].victimId : undefined,
        thiefId: playerId,
        items: theftVictims.map((theft) => ({
          type: 'resource',
          value: theft.resource,
          count: 1,
        })),
        victims: theftVictims.map((theft) => ({
          victimId: theft.victimId,
          items: [{ type: 'resource', value: theft.resource, count: 1 }],
        })),
        timestamp: Date.now(),
      };

      const victimNames = theftVictims
        .map((theft) => {
          const victim = state.players.find((p) => p.id === theft.victimId);
          return `${victim?.name} (${theft.resource})`;
        })
        .join(', ');

      addLog(
        state,
        `moved the robber with Taxation and stole from: ${victimNames}`,
        playerId
      );
    } else {
      addLog(state, 'moved the robber with Taxation (no one to steal from)', playerId);
    }

    return state;
  }
}
