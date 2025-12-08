import { useTransition, useState } from 'react';
import { GameState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { BoardSelectionState, BoardCallbacks } from '@/lib/types/board-selection-state';
import {
  placeSettlement,
  placeRoad,
  moveRobber,
  buildRoad,
  buildSettlement,
  buildCity,
  placeBonusRoad,
  buildKnight,
  buildCityWall,
  relocateKnight,
  moveKnight,
  placeMetropolis
} from '@/app/actions';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';
import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/core/validation/building-validator';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { getTotalResources } from '@/core/engine/resources/resource-manager';
import { getCanonicalVertexId } from '@/lib/hex';

/**
 * useBoardActions hook
 *
 * Extracts all click handler logic from Board.tsx
 * Handles user interactions with vertices, edges, and hexes
 *
 * @param gameState - Current game state
 * @param playerId - Current player ID
 * @param selectionState - Consolidated selection state
 * @param callbacks - Callback functions from parent component
 * @param validation - Validation sets from useBoardValidation hook
 * @param knightsMap - Map of knights by vertex ID
 * @param pendingPlacement - Pending placement state
 * @param setPendingPlacement - Set pending placement state
 * @returns Object with click handlers and pending state
 */
export function useBoardActions(
  gameState: GameState,
  playerId: string,
  selectionState: BoardSelectionState,
  callbacks: BoardCallbacks,
  validation: {
    validVertices: Set<string>;
    validEdges: Set<string>;
    validHexes: Set<string>;
  },
  knightsMap: Map<string, Knight>,
  pendingPlacement: any | null,
  setPendingPlacement: (placement: any | null) => void
) {
  const [isPending, startTransition] = useTransition();
  const [isPlacingBonusRoad, setIsPlacingBonusRoad] = useState(false);

  // Extract selection state
  const {
    buildMode,
    movingKnightId,
    buildingMetropolisType,
    hexCardSelection,
    vertexCardSelection,
    edgeCardSelection,
    citySelection,
    progressPrompt
  } = selectionState;

  const {
    onCancelBuild,
    onHexSelected,
    onVertexSelectedForCard,
    onEdgeSelectedForCard,
    onEngineerCitySelected,
    onMedicineCitySelected,
    onMetropolisCitySelected,
    onCityClick,
    onSettlementClick,
    onKnightClick,
    onBarbarianCitySelect,
    onRobberVictimRequest
  } = callbacks;

  // Handle vertex clicks (settlements, cities, knights, special cards)
  const handleVertexClick = (vertexId: string) => {
    if (isPending) return;

    // Allow viewing city details even if not current turn
    // Also allow viewing knight details
    const vertex = gameState.board.vertices[vertexId];
    const isOwnCity =
      vertex && (vertex.structure === 'city' || vertex.structure === 'metropolis') && vertex.owner === playerId;
    const isOwnKnight = knightsMap.has(vertexId) && knightsMap.get(vertexId)?.playerId === playerId;

    // Allow displaced player to relocate their knight even if it's not their turn
    const isDisplacedPlayer =
      gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId;

    // Allow barbarian victim to choose a city to lose
    const isBarbarianVictim =
      gameState.phase === 'barbarian_city_selection' && gameState.pendingBarbarianVictims?.includes(playerId);

    if (gameState.currentTurn !== playerId && !isOwnCity && !isOwnKnight && !isDisplacedPlayer && !isBarbarianVictim)
      return;

    // Barbarian City Selection
    if (gameState.phase === 'barbarian_city_selection') {
      if (isOwnCity && onBarbarianCitySelect) {
        onBarbarianCitySelect(vertexId);
      }
      return;
    }

    // Progress Card Vertex Selection
    if (vertexCardSelection && onVertexSelectedForCard) {
      if (validation.validVertices.has(vertexId)) {
        onVertexSelectedForCard(vertexId);
      }
      return;
    }

    // Medicine card - upgrade to city
    if (citySelection?.type === 'medicine' && validation.validVertices.has(vertexId)) {
      startTransition(async () => {
        try {
          await onMedicineCitySelected?.(vertexId);
          onCancelBuild();
        } catch (e) {
          console.error('Failed to upgrade city with Medicine', e);
        }
      });
      return;
    }

    // Engineer card - free city wall
    if (citySelection?.type === 'engineer' && validation.validVertices.has(vertexId)) {
      startTransition(async () => {
        try {
          await onEngineerCitySelected?.(vertexId);
        } catch (e) {
          console.error('Failed to build city wall with Engineering', e);
        }
      });
      return;
    }

    // Metropolis selection
    if (citySelection?.type === 'metropolis' && validation.validVertices.has(vertexId)) {
      startTransition(async () => {
        try {
          await onMetropolisCitySelected?.(vertexId);
        } catch (e) {
          console.error('Failed to select city for metropolis', e);
        }
      });
      return;
    }

    // Knight Movement Mode - USE SERVER ACTION (not fetch)
    if (movingKnightId) {
      const { isValidKnightMovement } = require('@/core/validation/knight-validator');
      if (isValidKnightMovement(gameState, movingKnightId, vertexId, playerId)) {
        startTransition(async () => {
          try {
            // FIXED: Use server action instead of fetch()
            await moveKnight(gameState.roomId, playerId, movingKnightId, vertexId);
            onCancelBuild();
          } catch (e) {
            console.error('Failed to move knight', e);
          }
        });
      }
      return;
    }

    // Metropolis Building Mode - USE SERVER ACTION (not fetch)
    if (buildingMetropolisType) {
      const { isValidMetropolisPlacement } = require('@/core/validation/metropolis-validator');
      if (isValidMetropolisPlacement(gameState, vertexId, playerId, buildingMetropolisType)) {
        startTransition(async () => {
          try {
            // FIXED: Use server action instead of fetch()
            await placeMetropolis(gameState.roomId, playerId, vertexId, buildingMetropolisType);
            onCancelBuild();
          } catch (e) {
            console.error('Failed to build metropolis', e);
          }
        });
      }
      return;
    }

    // Handle knight click (for activation/movement UI)
    const knight = knightsMap.get(vertexId);
    if (
      knight &&
      onKnightClick &&
      !buildMode &&
      !movingKnightId &&
      !vertexCardSelection &&
      !buildingMetropolisType
    ) {
      // Only allow knight interaction if it's my turn (or if we want to view knight details later)
      if (gameState.currentTurn === playerId) {
        onKnightClick(knight.id);
        return;
      }
    }

    // Setup phase placement
    if (gameState.phase.startsWith('setup')) {
      if (isValidSetupSettlement(gameState, vertexId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'settlement',
          id: vertexId,
          phase: 'setup'
        });
      }
    }
    // Knight displacement
    else if (gameState.phase === 'knight_displacement') {
      if (validation.validVertices.has(vertexId)) {
        startTransition(async () => {
          try {
            await relocateKnight(
              gameState.roomId,
              playerId,
              gameState.pendingDisplacement!.knightId,
              vertexId
            );
          } catch (e) {
            console.error('Failed to relocate knight', e);
          }
        });
      }
    }
    // Main phase placement
    else if (gameState.phase === 'main_phase') {
      if (buildMode === 'settlement' && isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'settlement',
          id: vertexId,
          phase: 'main'
        });
      } else if (buildMode === 'city' && isValidMainPhaseCity(gameState, vertexId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'city',
          id: vertexId,
          phase: 'main'
        });
      } else if (buildMode === 'knight' && isValidKnightPlacement(gameState, vertexId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'knight',
          id: vertexId,
          phase: 'main'
        });
      } else if (buildMode === 'city_wall' && canBuildCityWall(gameState, vertexId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'city_wall',
          id: vertexId,
          phase: 'main'
        });
      } else if (!buildMode && !movingKnightId && !vertexCardSelection && !buildingMetropolisType) {
        // Check for knight interaction first
        const knight = knightsMap.get(vertexId);
        if (knight && knight.playerId === playerId) {
          if (gameState.currentTurn === playerId) {
            onKnightClick?.(knight.id);
          }
          return;
        }

        // Handle city management click
        if (isOwnCity) {
          onCityClick?.(vertexId);
          return;
        }

        // Handle settlement management click
        const isOwnSettlement = vertex && vertex.structure === 'settlement' && vertex.owner === playerId;
        if (isOwnSettlement) {
          onSettlementClick?.(vertexId);
        }
      }
    }
  };

  // Handle edge clicks (roads, diplomat card)
  const handleEdgeClick = (edgeId: string) => {
    if (isPending || isPlacingBonusRoad) return;
    if (gameState.currentTurn !== playerId) return;

    // Progress Card Edge Selection
    if (edgeCardSelection && onEdgeSelectedForCard) {
      if (validation.validEdges.has(edgeId)) {
        onEdgeSelectedForCard(edgeId);
      }
      return;
    }

    // Setup phase
    if (gameState.phase.startsWith('setup')) {
      if (isValidSetupRoad(gameState, edgeId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'road',
          id: edgeId,
          phase: 'setup'
        });
      }
    }
    // Main phase road building
    else if (gameState.phase === 'main_phase' && buildMode === 'road') {
      if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        // Show pending placement for confirmation
        setPendingPlacement({
          type: 'road',
          id: edgeId,
          phase: 'main'
        });
      }
    }
    // Road building card
    else if (
      gameState.phase === 'road_building_1' ||
      gameState.phase === 'road_building_2' ||
      (progressPrompt?.visible && progressPrompt?.cardType === 'road_building_progress')
    ) {
      if (!progressPrompt?.ready && progressPrompt?.cardType === 'road_building_progress') return; // wait until server effect active to avoid errors
      if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        setIsPlacingBonusRoad(true);
        (async () => {
          try {
            await placeBonusRoad(gameState.roomId, playerId, edgeId);
          } catch (e) {
            console.error('Failed to place bonus road', e);
          } finally {
            setIsPlacingBonusRoad(false);
          }
        })();
      }
    }
  };

  // Handle hex clicks (robber, progress cards)
  const handleHexClick = (hexId: string) => {
    if (isPending) return;
    if (gameState.currentTurn !== playerId) return;

    // Progress card hex selection
    if (hexCardSelection && onHexSelected) {
      if (validation.validHexes.has(hexId)) {
        onHexSelected(hexId);
      }
      return;
    }

    // Robber placement
    if (gameState.phase === 'robber_placement') {
      // Find potential victims on this hex
      const [q, r] = hexId.split(',').map(Number);
      const potentialVictims = new Set<string>();

      for (let d = 0; d < 6; d++) {
        const vId = getCanonicalVertexId(q, r, d);
        const vertex = gameState.board.vertices[vId];
        if (vertex && vertex.owner && vertex.owner !== playerId) {
          // Check if they have resources
          const victim = gameState.players.find(p => p.id === vertex.owner);
          if (victim && getTotalResources(victim) > 0) {
            potentialVictims.add(vertex.owner);
          }
        }
      }

      const victimsArray = Array.from(potentialVictims);

      // If multiple victims, show selection modal
      if (victimsArray.length > 1 && onRobberVictimRequest) {
        onRobberVictimRequest(hexId, victimsArray);
      } else {
        // Single or no victim - proceed directly
        const victimId = victimsArray.length === 1 ? victimsArray[0] : undefined;
        startTransition(async () => {
          try {
            await moveRobber(gameState.roomId, playerId, hexId, victimId);
          } catch (e) {
            console.error('Failed to move robber', e);
          }
        });
      }
    }
  };

  // Handle placement cancellation
  const handleCancelPlacement = () => {
    setPendingPlacement(null);
  };

  // Handle placement confirmation
  const handleConfirmPlacement = () => {
    if (!pendingPlacement) return;

    const { type, id, phase } = pendingPlacement;

    if (type === 'settlement') {
      if (phase === 'setup') {
        startTransition(async () => {
          try {
            await placeSettlement(gameState.roomId, playerId, id);
            setPendingPlacement(null);
          } catch (e) {
            console.error('Failed to place settlement', e);
            setPendingPlacement(null);
          }
        });
      } else {
        startTransition(async () => {
          try {
            await buildSettlement(gameState.roomId, playerId, id);
            setPendingPlacement(null);
            onCancelBuild();
          } catch (e) {
            console.error('Failed to build settlement', e);
            setPendingPlacement(null);
          }
        });
      }
    } else if (type === 'road') {
      if (phase === 'setup') {
        startTransition(async () => {
          try {
            await placeRoad(gameState.roomId, playerId, id);
            setPendingPlacement(null);
          } catch (e) {
            console.error('Failed to place road', e);
            setPendingPlacement(null);
          }
        });
      } else {
        startTransition(async () => {
          try {
            await buildRoad(gameState.roomId, playerId, id);
            setPendingPlacement(null);
            onCancelBuild();
          } catch (e) {
            console.error('Failed to build road', e);
            setPendingPlacement(null);
          }
        });
      }
    } else if (type === 'city') {
      startTransition(async () => {
        try {
          await buildCity(gameState.roomId, playerId, id);
          setPendingPlacement(null);
          onCancelBuild();
        } catch (e) {
          console.error('Failed to build city', e);
          setPendingPlacement(null);
        }
      });
    } else if (type === 'knight') {
      startTransition(async () => {
        try {
          await buildKnight(gameState.roomId, playerId, id);
          setPendingPlacement(null);
          onCancelBuild();
        } catch (e) {
          console.error('Failed to build knight', e);
          setPendingPlacement(null);
        }
      });
    } else if (type === 'city_wall') {
      startTransition(async () => {
        try {
          await buildCityWall(gameState.roomId, playerId, id);
          setPendingPlacement(null);
          onCancelBuild();
        } catch (e) {
          console.error('Failed to build city wall', e);
          setPendingPlacement(null);
        }
      });
    }
  };

  return {
    handleVertexClick,
    handleEdgeClick,
    handleHexClick,
    handleCancelPlacement,
    handleConfirmPlacement,
    isPending,
    isPlacingBonusRoad
  };
}
