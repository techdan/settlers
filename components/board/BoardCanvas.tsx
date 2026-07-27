'use client';

import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { boardTheme } from '@/themes/board-theme';
import { generatePorts } from '@/core/engine/board/port-generator';
import { getBarbarianForces } from '@/core/rules/barbarian-strength';
import { Edge, GameState, Vertex } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { BoardSelectionState, PendingBoardPlacement } from '@/lib/types/board-selection-state';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { BoardControls } from './BoardControls';

const BOARD_PAN_MARGIN_PX = 100;
const BOARD_PANNING_OPTIONS = { velocityDisabled: true } as const;
const BOARD_ALIGNMENT_OPTIONS = {
  disabled: true,
  sizeX: BOARD_PAN_MARGIN_PX,
  sizeY: BOARD_PAN_MARGIN_PX,
} as const;
const {
  BarbarianRoute,
  HexTile,
  Port,
  SeaFrame,
  palette: BOARD_PALETTE,
  viewBox: BOARD_VIEWBOX,
} = boardTheme;

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
  vertices: Vertex[];
  renderEdges: Edge[];
  knightsMap: Map<string, Knight>;
  pendingPlacement: PendingBoardPlacement | null;
  displayedRobberHexId: string | null;
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
  displayedRobberHexId,
  onVertexClick,
  onEdgeClick,
  onHexClick,
  onConfirmPlacement,
  onCancelPlacement,
  onCancelBuild
}) => {
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
    buildMode,
    movingKnightId,
    smithSelection
  } = selectionState;

  const currentPlayerColor = gameState.players.find(player => player.id === playerId)?.color;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: BOARD_PALETTE.sea }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={1.3}
        centerOnInit
        limitToBounds
        panning={BOARD_PANNING_OPTIONS}
        alignmentAnimation={BOARD_ALIGNMENT_OPTIONS}
      >
        {({ zoomIn, zoomOut }) => (
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
                  viewBox={BOARD_VIEWBOX}
                >
                  <SeaFrame />

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
                        hasRobber={displayedRobberHexId === tile.id}
                        hasMerchant={gameState.merchantHexId === tile.id}
                        merchantColor={merchantOwner?.color}
                        size={hexSize}
                        onClick={() => onHexClick(tile.id)}
                        isRolled={isRolled}
                        isSelectable={validation.validHexes.has(tile.id)}
                        selectionVariant={selectionVariant}
                        selectionState={selectionState}
                        isPendingRobberPlacement={
                          pendingPlacement?.type === 'robber' && pendingPlacement.id === tile.id
                        }
                        onConfirmPlacement={onConfirmPlacement}
                        onCancelPlacement={onCancelPlacement}
                      />
                    );
                  })}

                  {/* Ports */}
                  {ports.map((port, i) => (
                    <Port key={i} port={port} />
                  ))}

                  {/* Barbarian sea route (C&K) — replaces the HUD BarbarianTrack panel */}
                  {gameState.gameMode === 'cities_and_knights' && (() => {
                    const forces = getBarbarianForces(gameState);
                    return (
                      <BarbarianRoute
                        barbarianPosition={gameState.barbarianPosition ?? 0}
                        totalKnightStrength={forces.knights}
                        totalCityCount={forces.cities}
                        skipFirstBarbarianAttack={gameState.skipFirstBarbarianAttack}
                        hasBarbariansAttacked={gameState.hasBarbariansAttacked}
                        isUnderAttack={gameState.phase === 'barbarian_city_selection'}
                        ports={ports}
                      />
                    );
                  })()}

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
                      : gameState.players.find(p => p.id === vertex.owner)?.color ??
                        (isValidKnightTarget(validation.validVertices, vertex.id, buildMode) ? currentPlayerColor : undefined);

                    // Calculate selection/highlight states
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
                        showCancelIcon={isSmithCancel}
                        cancelIconTitle="Cancel Smithing"
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
                        validTargetType={validation.validVertices.has(vertex.id) ? buildMode ?? undefined : undefined}
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

function isValidKnightTarget(validVertices: Set<string>, vertexId: string, buildMode: BoardSelectionState['buildMode']) {
  return buildMode === 'knight' && validVertices.has(vertexId);
}
