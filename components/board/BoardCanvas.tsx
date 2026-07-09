'use client';

import React, { useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile } from '@/themes/flat/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { Tooltip } from '@/components/ui/tooltip';
import { generatePorts, getPortForVertex } from '@/core/engine/board/port-generator';
import { GameState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { BoardSelectionState } from '@/lib/types/board-selection-state';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { BoardControls } from './BoardControls';
import { BoardIconDefs } from './board-icon-defs';
import { createHex, hexCornerToPixel } from '@/lib/hex';

/**
 * BoardCanvas - Pure rendering component for the game board
 *
 * This component ONLY renders. All business logic, validation, and interaction
 * handling is done in parent components and hooks.
 *
 * Key principles:
 * - NO useTransition
 * - NO fetch calls
 * - NO validation logic
 * - Props-driven rendering only
 */

interface BoardCanvasProps {
  gameState: GameState;
  playerId: string;
  hexSize: number;
  selectionState: BoardSelectionState;
  validation: {
    validVertices: Set<string>;
    validEdges: Set<string>;
    validHexes: Set<string>;
  };
  vertices: any[];
  renderEdges: any[];
  knightsMap: Map<string, Knight>;
  pendingPlacement: any | null;
  onVertexClick: (vertexId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onHexClick: (hexId: string) => void;
  onConfirmPlacement: () => void;
  onCancelPlacement: () => void;
  onCancelBuild: () => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  gameState,
  playerId,
  hexSize,
  selectionState,
  validation,
  vertices,
  renderEdges,
  knightsMap,
  pendingPlacement,
  onVertexClick,
  onEdgeClick,
  onHexClick,
  onConfirmPlacement,
  onCancelPlacement,
  onCancelBuild
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);

  // Generate ports based on hex size
  const ports = useMemo(() => generatePorts(hexSize), [hexSize]);

  // Get tiles from game state
  const tiles = gameState.board.hexes;

  // Stable top-to-bottom render order for the hex grid
  const sortedTiles = useMemo(
    () =>
      [...tiles].sort((a, b) => {
        if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
        return a.hex.q - b.hex.q;
      }),
    [tiles]
  );

  // Extract selection state for rendering
  const {
    hexCardSelection,
    vertexCardSelection,
    edgeCardSelection,
    citySelection,
    movingKnightId,
    smithSelection
  } = selectionState;

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={1.3}
        centerOnInit
        limitToBounds={false}
        onTransformed={ref => {
          setZoomLevel(ref.state.scale);
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
          <>
            <BoardControls
              onZoomIn={() => zoomIn(0.1)}
              onZoomOut={() => zoomOut(0.1)}
            />

            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full"
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <svg
                  id="board-svg"
                  className="overflow-visible"
                  width="100%"
                  height="100%"
                  viewBox="-500 -500 1000 1000"
                >
                  <BoardIconDefs />

                  {/* Hex Grid */}
                  {sortedTiles.map(tile => {
                    const isRolled = gameState.diceRoll && tile.numberToken === gameState.diceRoll.total;

                    // Calculate selection state for hex highlighting
                    const selectionState =
                      tile.id === hexCardSelection?.inventorSelection?.firstHexId
                        ? 'primary'
                        : tile.id === hexCardSelection?.inventorSelection?.secondHexId
                          ? 'secondary'
                          : hexCardSelection?.type === 'merchant' && hexCardSelection?.selectedHexId === tile.id
                            ? 'primary'
                            : hexCardSelection?.type === 'taxation' && hexCardSelection?.selectedHexId === tile.id
                              ? 'primary'
                              : null;

                    const selectionVariant =
                      hexCardSelection?.type === 'inventor' ||
                        hexCardSelection?.type === 'merchant' ||
                        hexCardSelection?.type === 'taxation'
                        ? 'cursor'
                        : 'glow';

                    const merchantOwner = gameState.activeMerchant
                      ? gameState.players.find(p => p.id === gameState.activeMerchant)
                      : null;

                    return (
                      <HexTile
                        key={tile.id}
                        hex={tile.hex}
                        terrain={tile.terrain}
                        numberToken={tile.numberToken}
                        hasRobber={gameState.robberHexId === tile.id}
                        hasMerchant={gameState.merchantHexId === tile.id}
                        merchantColor={merchantOwner?.color}
                        size={hexSize}
                        onClick={() => onHexClick(tile.id)}
                        isRolled={isRolled}
                        isSelectable={validation.validHexes.has(tile.id)}
                        selectionVariant={selectionVariant}
                        selectionState={selectionState}
                      />
                    );
                  })}

                  {/* Ports */}
                  {ports.map((port, i) => (
                    <FlatPort key={i} port={port} />
                  ))}

                  {/* Edges (Roads) */}
                  {renderEdges.map(edge => {
                    const isPending = pendingPlacement?.type === 'road' && pendingPlacement.id === edge.id;
                    const isDiplomatSelected =
                      edgeCardSelection?.type === 'diplomat' &&
                      (edge.id === edgeCardSelection.selectedEdgeId ||
                        edge.id === edgeCardSelection.removedEdgeId);
                    return (
                      <EdgeRenderer
                        key={edge.id}
                        edge={edge}
                        size={hexSize}
                        color={gameState.players.find(p => p.id === edge.owner)?.color}
                        onClick={onEdgeClick}
                        isValid={validation.validEdges.has(edge.id)}
                        isSelected={isDiplomatSelected}
                        isPendingPlacement={isPending}
                        onConfirmPlacement={onConfirmPlacement}
                        onCancelPlacement={onCancelPlacement}
                      />
                    );
                  })}

                  {/* Vertices (Settlements/Cities/Knights) */}
                  {vertices.map(vertex => {
                    const knight = knightsMap.get(vertex.id);
                    const isMoving = knight && knight.id === movingKnightId;

                    // Use knight owner's color if knight exists, otherwise vertex owner's color
                    const ownerColor = knight
                      ? gameState.players.find(p => p.id === knight.playerId)?.color
                      : gameState.players.find(p => p.id === vertex.owner)?.color;

                    // Calculate selection/highlight states
                    const isEngineerCancel = false;
                    const isMedicineCancel = false;
                    const isSmithCancel = !!(smithSelection?.selectableKnightIds && validation.validVertices.has(vertex.id));
                    const isEngineerSelected = !!(
                      citySelection?.type === 'engineer' && citySelection?.selectedCityId === vertex.id
                    );
                    const isMedicineSelected = !!(
                      citySelection?.type === 'medicine' && citySelection?.selectedCityId === vertex.id
                    );
                    const isMetropolisSelected = !!(
                      citySelection?.type === 'metropolis' && citySelection?.selectedCityId === vertex.id
                    );
                    const isSmithSelected = !!(
                      smithSelection?.selectableKnightIds &&
                      knight &&
                      smithSelection?.selectedKnightIds?.includes(knight.id)
                    );
                    const isIntrigueSelected = !!(
                      vertexCardSelection?.type === 'intrigue' &&
                      knight &&
                      vertexCardSelection?.selectedKnightId === knight.id
                    );
                    const isTreasonSelected = !!(
                      vertexCardSelection?.type === 'treason_remove' &&
                      knight &&
                      vertexCardSelection?.selectedKnightId === knight.id
                    );
                    const isTreasonPlacementSelected = !!(
                      vertexCardSelection?.type === 'treason_place' &&
                      vertexCardSelection?.placementVertexId === vertex.id
                    );
                    const highlightVariant = vertexCardSelection?.type === 'treason_place' ? 'treason' : 'default';

                    // Check if any vertex-based placement is pending for this vertex
                    const isPending =
                      !!pendingPlacement &&
                      (pendingPlacement.type === 'settlement' ||
                        pendingPlacement.type === 'city' ||
                        pendingPlacement.type === 'knight' ||
                        pendingPlacement.type === 'city_wall') &&
                      pendingPlacement.id === vertex.id;

                    return (
                      <VertexRenderer
                        key={vertex.id}
                        vertex={vertex}
                        knight={knight}
                        size={hexSize}
                        color={ownerColor}
                        onClick={onVertexClick}
                        isValid={validation.validVertices.has(vertex.id)}
                        isMoving={isMoving}
                        onCancelMove={onCancelBuild}
                        currentPlayerId={playerId}
                        showCancelIcon={isEngineerCancel || isMedicineCancel || isSmithCancel}
                        cancelIconTitle={isMedicineCancel ? 'Cancel Medicine' : 'Cancel Smithing'}
                        isSelectedForAction={
                          isEngineerSelected ||
                          isMedicineSelected ||
                          isMetropolisSelected ||
                          isSmithSelected ||
                          isIntrigueSelected ||
                          isTreasonSelected ||
                          isTreasonPlacementSelected
                        }
                        highlightVariant={highlightVariant}
                        onCancelIconClick={onCancelBuild}
                        isPendingPlacement={isPending}
                        onConfirmPlacement={onConfirmPlacement}
                        onCancelPlacement={onCancelPlacement}
                      />
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
