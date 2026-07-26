'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BoardCanvas } from './BoardCanvas';
import { useBoardValidation } from '@/lib/hooks/useBoardValidation';
import { useBoardActions } from '@/lib/hooks/useBoardActions';
import { BoardProps, PendingBoardPlacement } from '@/lib/types/board-selection-state';
import { Knight } from '@/lib/types/player';

/**
 * Board Component - Thin Orchestrator
 *
 * This component orchestrates the board rendering and interactions by:
 * 1. Managing pending placement state
 * 2. Computing derived state (vertices, edges, knights)
 * 3. Using validation hook for valid placements
 * 4. Using actions hook for user interactions
 * 5. Rendering BoardCanvas with all required props
 *
 * All business logic is delegated to hooks and child components.
 */
export const Board: React.FC<BoardProps> = ({
  gameState,
  playerId,
  selectionState,
  callbacks
}) => {
  const HEX_SIZE = 90;

  // Pending placement state for confirmation modal
  const [pendingPlacement, setPendingPlacement] = useState<PendingBoardPlacement | null>(null);


  // Clear pending placement when build mode changes (e.g., when toggling build buttons)
  useEffect(() => {
    if (pendingPlacement) {
      setPendingPlacement(null);
    }
    // We only want to clear when buildMode changes, not when pendingPlacement changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionState.buildMode]);

  // The authoritative phase update completes a confirmed robber move.
  useEffect(() => {
    if (gameState.phase !== 'robber_placement') {
      setPendingPlacement(current => current?.type === 'robber' ? null : current);
    }
  }, [gameState.phase]);

  // Base vertices from game state
  const baseVertices = Object.values(gameState.board.vertices);
  const baseEdges = Object.values(gameState.board.edges);

  // Show pending placement (settlement, city, knight, city_wall)
  const vertices = useMemo(() => {
    let processedVertices = baseVertices;

    // Handle pending placement
    if (pendingPlacement) {
      if (pendingPlacement.type === 'settlement') {
        processedVertices = processedVertices.map(vertex => {
          if (vertex.id === pendingPlacement.id) {
            return { ...vertex, owner: playerId, structure: 'settlement' as const };
          }
          return vertex;
        });
      } else if (pendingPlacement.type === 'city') {
        processedVertices = processedVertices.map(vertex => {
          if (vertex.id === pendingPlacement.id) {
            return { ...vertex, owner: playerId, structure: 'city' as const };
          }
          return vertex;
        });
      } else if (pendingPlacement.type === 'city_wall') {
        processedVertices = processedVertices.map(vertex => {
          if (vertex.id === pendingPlacement.id) {
            return { ...vertex, hasCityWall: true };
          }
          return vertex;
        });
      }
      // Knights are handled separately via knightsMap
    }

    // Handle Medicine card selection - show settlement as city preview
    if (selectionState.citySelection?.type === 'medicine' && selectionState.citySelection.selectedCityId) {
      processedVertices = processedVertices.map(vertex => {
        if (vertex.id === selectionState.citySelection?.selectedCityId) {
          return { ...vertex, structure: 'city' as const };
        }
        return vertex;
      });
    }

    // Handle Metropolis selection - show city as metropolis preview
    if (selectionState.citySelection?.type === 'metropolis' && selectionState.citySelection.selectedCityId) {
      processedVertices = processedVertices.map(vertex => {
        if (vertex.id === selectionState.citySelection?.selectedCityId) {
          return { ...vertex, structure: 'metropolis' as const };
        }
        return vertex;
      });
    }

    return processedVertices;
  }, [baseVertices, pendingPlacement, playerId, selectionState.citySelection]);

  // Handle diplomat edge modifications and pending road placement
  const renderEdges = useMemo(() => {
    let processedEdges = baseEdges;

    // Handle diplomat edge modifications
    if (selectionState.edgeCardSelection?.type === 'diplomat' && selectionState.edgeCardSelection.stage) {
      processedEdges = baseEdges.map(edge => {
        if (
          selectionState.edgeCardSelection?.stage === 'rebuild' &&
          selectionState.edgeCardSelection?.removedEdgeId &&
          edge.id === selectionState.edgeCardSelection.removedEdgeId
        ) {
          return { ...edge, owner: null, structure: null };
        }
        if (
          selectionState.edgeCardSelection?.stage === 'rebuild' &&
          selectionState.edgeCardSelection?.relocatedEdgeId &&
          edge.id === selectionState.edgeCardSelection.relocatedEdgeId
        ) {
          return { ...edge, owner: playerId, structure: 'road' as const };
        }
        return edge;
      });
    }

    // Show pending road placement
    if (pendingPlacement?.type === 'road') {
      processedEdges = processedEdges.map(edge => {
        if (edge.id === pendingPlacement.id) {
          return { ...edge, owner: playerId, structure: 'road' as const };
        }
        return edge;
      });
    }

    return processedEdges;
  }, [baseEdges, selectionState.edgeCardSelection, playerId, pendingPlacement]);

  // Build knights map with pending knight placement
  const knightsMap = useMemo(() => {
    const map = new Map<string, Knight>();
    gameState.players.forEach(p => {
      p.knights?.forEach(k => {
        map.set(k.vertexId, k);
      });
    });

    // Add pending knight placement
    if (pendingPlacement?.type === 'knight') {
      const pendingKnight: Knight = {
        id: 'pending-knight',
        playerId: playerId,
        vertexId: pendingPlacement.id,
        level: 'basic',
        active: false
      };
      map.set(pendingPlacement.id, pendingKnight);
    }

    return map;
  }, [gameState.players, pendingPlacement, playerId]);

  // Get hex tiles
  const tiles = gameState.board.hexes;
  const displayedRobberHexId =
    pendingPlacement?.type === 'robber' ? pendingPlacement.id : gameState.robberHexId;

  // Use validation hook
  const validation = useBoardValidation(
    gameState,
    playerId,
    selectionState,
    vertices,
    baseEdges,
    tiles,
    pendingPlacement
  );

  // Use actions hook
  const actions = useBoardActions(
    gameState,
    playerId,
    selectionState,
    callbacks,
    validation,
    knightsMap,
    pendingPlacement,
    setPendingPlacement
  );

  // Render canvas with all the wiring
  return (
    <BoardCanvas
      gameState={gameState}
      playerId={playerId}
      hexSize={HEX_SIZE}
      selectionState={selectionState}
      validation={validation}
      vertices={vertices}
      renderEdges={renderEdges}
      knightsMap={knightsMap}
      pendingPlacement={pendingPlacement}
      displayedRobberHexId={displayedRobberHexId}
      onVertexClick={actions.handleVertexClick}
      onEdgeClick={actions.handleEdgeClick}
      onHexClick={actions.handleHexClick}
      onConfirmPlacement={actions.handleConfirmPlacement}
      onCancelPlacement={actions.handleCancelPlacement}
      onCancelBuild={callbacks.onCancelBuild}
    />
  );
};
