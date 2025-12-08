import { useMemo } from 'react';
import { GameState } from '@/lib/types';
import { BoardSelectionState } from '@/lib/types/board-selection-state';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';
import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/core/validation/building-validator';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';
import { getOpenRoadIds } from '@/core/validation/diplomat-validator';
import { getAdjacentEdgesForVertex } from '@/lib/hex';

/**
 * useBoardValidation hook
 *
 * Extracts all validation logic from Board.tsx
 * Returns sets of valid vertices, edges, and hexes for highlighting
 *
 * @param gameState - Current game state
 * @param playerId - Current player ID
 * @param selectionState - Consolidated selection state
 * @param vertices - Board vertices (for iteration)
 * @param edges - Board edges (for iteration)
 * @param tiles - Board tiles (for iteration)
 * @param pendingPlacement - Pending placement state (if any)
 * @returns Object with validation sets and helper state
 */
export function useBoardValidation(
  gameState: GameState,
  playerId: string,
  selectionState: BoardSelectionState,
  vertices: any[],
  edges: any[],
  tiles: any[],
  pendingPlacement: any | null
) {
  // Extract selection state properties
  const {
    buildMode,
    movingKnightId,
    buildingMetropolisType,
    hexCardSelection,
    vertexCardSelection,
    edgeCardSelection,
    citySelection,
    smithSelection
  } = selectionState;

  // Diplomat placement state - computes modified game state with removed road
  const diplomatPlacementState = useMemo(() => {
    if (
      edgeCardSelection?.type !== 'diplomat' ||
      edgeCardSelection?.stage !== 'rebuild' ||
      !edgeCardSelection?.removedEdgeId
    ) {
      return null;
    }

    if (!gameState) return null;

    const removedEdge = gameState.board.edges[edgeCardSelection.removedEdgeId];
    if (!removedEdge) return null;

    return {
      ...gameState,
      board: {
        ...gameState.board,
        edges: {
          ...gameState.board.edges,
          [edgeCardSelection.removedEdgeId]: { ...removedEdge, owner: null, structure: null }
        }
      }
    };
  }, [edgeCardSelection, gameState]);

  // Calculate valid vertices for highlighting
  const validVertices = useMemo(() => {
    const valid = new Set<string>();

    // If there's a pending placement, don't show valid spots
    if (pendingPlacement) return valid;

    // Knight Displacement Mode - Must be checked FIRST before currentTurn check
    // The displaced player needs to relocate even if it's not their turn
    if (gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId) {
      const originVertexId = gameState.pendingDisplacement.originVertexId;
      const targets = getValidRelocationTargets(gameState, playerId, originVertexId);
      targets.forEach((t: string) => valid.add(t));
      return valid;
    }

    // Barbarian City Selection - Must be checked before currentTurn check
    if (gameState.phase === 'barbarian_city_selection' && gameState.pendingBarbarianVictims?.includes(playerId)) {
      vertices.forEach(v => {
        if (v.owner === playerId && v.structure === 'city') {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Treason (targeted player selects knight) - allow even when not current turn
    if (vertexCardSelection?.type === 'treason_remove') {
      vertices.forEach(v => {
        const knight = gameState.players
          .flatMap(p => p.knights || [])
          .find(k => k.vertexId === v.id);
        if (knight && knight.playerId === playerId) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Treason placement selection (initiator) - allowed even if not current turn due to active effect
    if (vertexCardSelection?.type === 'treason_place') {
      vertices.forEach(v => {
        if (isValidKnightPlacement(gameState, v.id, playerId)) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // For all other actions, must be the current player's turn
    if (gameState.currentTurn !== playerId) return valid;

    // Knight Movement Mode
    if (movingKnightId) {
      // Find the knight being moved
      const knight = gameState.players
        .flatMap(p => p.knights || [])
        .find(k => k.id === movingKnightId);

      if (knight && knight.playerId === playerId) {
        // Import the validator function inline to avoid circular dependencies
        const { canMoveKnightToVertex } = require('@/core/validation/knight-validator');
        vertices.forEach(v => {
          if (canMoveKnightToVertex(gameState, knight, v.id, playerId)) {
            valid.add(v.id);
          }
        });
      }
      return valid;
    }

    // Metropolis Building Mode
    if (buildingMetropolisType) {
      vertices.forEach(v => {
        // Must be player's city (not settlement, not already metropolis)
        if (v.owner === playerId && v.structure === 'city') {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Medicine card - city upgrade
    if (citySelection?.type === 'medicine') {
      vertices.forEach(v => {
        if (isValidMainPhaseCity(gameState, v.id, playerId)) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Smith card - knight upgrades
    if (smithSelection?.selectableKnightIds && smithSelection.selectableKnightIds.length > 0) {
      smithSelection.selectableKnightIds.forEach(id => valid.add(id));
      return valid;
    }

    // Engineering progress card - free city wall placement
    if (citySelection?.type === 'engineer') {
      vertices.forEach(v => {
        if (canBuildCityWall(gameState, v.id, playerId, { ignoreCost: true })) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Metropolis selection - player's cities
    if (citySelection?.type === 'metropolis') {
      vertices.forEach(v => {
        if (v.owner === playerId && v.structure === 'city') {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Progress Card Vertex Selection (Intrigue)
    if (vertexCardSelection?.type === 'intrigue') {
      // Intrigue: Move opponent's knight to any location
      // Valid vertices are those with opponent's knights
      vertices.forEach(v => {
        const knight = gameState.players
          .flatMap(p => p.knights || [])
          .find(k => k.vertexId === v.id);

        if (knight && knight.playerId !== playerId) {
          // Check if the knight is on a road network connected to player's road
          const adjacentEdgeIds = getAdjacentEdgesForVertex(v.q, v.r, v.d);
          const connectedEdges = adjacentEdgeIds
            .map(id => gameState.board.edges[id])
            .filter(e => e !== undefined);

          const hasPlayerRoad = connectedEdges.some(e => e && e.owner === playerId);

          if (hasPlayerRoad) {
            valid.add(v.id);
          }
        }
      });
      return valid;
    }

    // Setup phase
    if (gameState.phase.startsWith('setup')) {
      vertices.forEach(v => {
        if (isValidSetupSettlement(gameState, v.id, playerId)) {
          valid.add(v.id);
        }
      });
    }
    // Main phase build modes
    else if (gameState.phase === 'main_phase') {
      if (gameState.currentTurn === playerId) {
        if (buildMode === 'settlement') {
          vertices.forEach(v => {
            if (isValidMainPhaseSettlement(gameState, v.id, playerId)) {
              valid.add(v.id);
            }
          });
        } else if (buildMode === 'city') {
          vertices.forEach(v => {
            if (isValidMainPhaseCity(gameState, v.id, playerId)) {
              valid.add(v.id);
            }
          });
        } else if (buildMode === 'knight') {
          vertices.forEach(v => {
            if (isValidKnightPlacement(gameState, v.id, playerId)) {
              valid.add(v.id);
            }
          });
        } else if (buildMode === 'city_wall') {
          // City walls are per-city, highlight valid cities
          vertices.forEach(v => {
            if (canBuildCityWall(gameState, v.id, playerId)) {
              valid.add(v.id);
            }
          });
        }
      }
    }
    return valid;
  }, [
    gameState,
    playerId,
    buildMode,
    vertices,
    movingKnightId,
    buildingMetropolisType,
    vertexCardSelection,
    citySelection,
    smithSelection,
    pendingPlacement
  ]);

  // Calculate valid edges for highlighting
  const validEdges = useMemo(() => {
    const valid = new Set<string>();

    // If there's a pending placement, don't show valid spots
    if (pendingPlacement) return valid;

    if (gameState.currentTurn !== playerId) return valid;

    // Progress Card Edge Selection (Diplomat)
    if (edgeCardSelection?.type === 'diplomat') {
      if (edgeCardSelection?.stage === 'rebuild') {
        const stateForPlacement = diplomatPlacementState ?? gameState;
        Object.values(stateForPlacement.board.edges).forEach(edge => {
          if (isValidMainPhaseRoad(stateForPlacement, edge.id, playerId)) {
            valid.add(edge.id);
          }
        });
      } else {
        getOpenRoadIds(gameState).forEach(id => valid.add(id));
      }
      return valid;
    }

    // Treason placement (vertices, not edges - but kept for consistency)
    if (vertexCardSelection?.type === 'treason_place') {
      vertices.forEach(v => {
        if (isValidKnightPlacement(gameState, v.id, playerId)) {
          valid.add(v.id);
        }
      });
      return valid;
    }

    // Setup phase
    if (gameState.phase.startsWith('setup')) {
      edges.forEach(e => {
        if (isValidSetupRoad(gameState, e.id, playerId)) {
          valid.add(e.id);
        }
      });
    }
    // Main phase road building
    else if (gameState.phase === 'main_phase' && buildMode === 'road') {
      edges.forEach(e => {
        if (isValidMainPhaseRoad(gameState, e.id, playerId)) {
          valid.add(e.id);
        }
      });
    }
    // Road building card phases
    else if (gameState.phase === 'road_building_1' || gameState.phase === 'road_building_2') {
      edges.forEach(e => {
        if (isValidMainPhaseRoad(gameState, e.id, playerId)) {
          valid.add(e.id);
        }
      });
    }
    return valid;
  }, [
    gameState,
    playerId,
    buildMode,
    edges,
    edgeCardSelection,
    diplomatPlacementState,
    pendingPlacement,
    vertices,
    vertexCardSelection
  ]);

  // Calculate valid hexes for highlighting
  const validHexes = useMemo(() => {
    const valid = new Set<string>();
    if (gameState.currentTurn !== playerId) return valid;

    // Robber placement
    if (gameState.phase === 'robber_placement') {
      tiles.forEach(hex => {
        if (hex.id !== gameState.robberHexId) {
          valid.add(hex.id);
        }
      });
      return valid;
    }

    if (!hexCardSelection) return valid;

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (!currentPlayer) return valid;

    // Helper function to get hex vertex IDs
    const getHexVertexIds = (hexId: string): string[] => {
      const [q, r] = hexId.split(',').map(Number);
      if (Number.isNaN(q) || Number.isNaN(r)) return [];
      const { getCanonicalVertexId } = require('@/lib/hex');
      return Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));
    };

    tiles.forEach(hex => {
      switch (hexCardSelection.type) {
        case 'merchant':
          // Hex must be adjacent to player's settlement/city
          const hasAdjacentSettlement = getHexVertexIds(hex.id).some((vertexId: string) => {
            const vertex = gameState.board.vertices[vertexId];
            return vertex && vertex.owner === playerId && vertex.structure;
          });
          if (hasAdjacentSettlement && hex.terrain !== 'desert' && hex.terrain !== 'ocean') {
            valid.add(hex.id);
          }
          break;

        case 'inventor':
          // Any non-restricted hex with a number token (not 2,6,8,12 and not desert/ocean)
          const restrictedNumbers = [2, 6, 8, 12];
          const token = hex.numberToken;
          const isRestrictedToken = token ? restrictedNumbers.includes(token) : true;
          const isRestrictedTerrain = hex.terrain === 'desert' || hex.terrain === 'ocean';
          if (!isRestrictedToken && !isRestrictedTerrain) {
            valid.add(hex.id);
          }
          break;

        case 'taxation':
          if (hex.terrain !== 'ocean' && hex.id !== gameState.robberHexId) {
            valid.add(hex.id);
          }
          break;
      }
    });

    return valid;
  }, [gameState, playerId, hexCardSelection, tiles]);

  return {
    validVertices,
    validEdges,
    validHexes,
    diplomatPlacementState
  };
}
