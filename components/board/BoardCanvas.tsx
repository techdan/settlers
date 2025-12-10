'use client';

import React, { useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { Tooltip } from '@/components/ui/tooltip';
import { generatePorts } from '@/core/engine/board/port-generator';
import { GameState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { BoardSelectionState } from '@/lib/types/board-selection-state';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';

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
  theme: 'flat' | 'voxel';
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
  onToggleTheme: () => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  gameState,
  playerId,
  theme,
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
  onCancelBuild,
  onToggleTheme
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);

  // Generate ports based on hex size
  const ports = useMemo(() => generatePorts(hexSize), [hexSize]);

  // Get tiles from game state
  const tiles = gameState.board.hexes;

  // Sort tiles for Voxel rendering (Painter's Algorithm: Top -> Bottom)
  const sortedTiles = useMemo(
    () =>
      [...tiles].sort((a, b) => {
        if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
        return a.hex.q - b.hex.q;
      }),
    [tiles]
  );

  // Select tile and port components based on theme
  const TileComponent = theme === 'flat' ? FlatHexTile : VoxelHexTile;
  const PortComponent = theme === 'flat' ? FlatPort : VoxelPort;

  // Extract selection state for rendering
  const {
    hexCardSelection,
    vertexCardSelection,
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
            {/* Map Controls: Zoom In, Zoom Out, 2D/3D Toggle */}
            <div className="absolute top-4 left-4 z-10 pointer-events-auto flex items-center gap-1">
              <Tooltip content="Zoom In" placement="bottom">
                <button
                  onClick={() => zoomIn(0.1)}
                  className="bg-slate-800/90 text-white w-9 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold text-lg cursor-pointer"
                >
                  +
                </button>
              </Tooltip>
              <Tooltip content="Zoom Out" placement="bottom">
                <button
                  onClick={() => zoomOut(0.1)}
                  className="bg-slate-800/90 text-white w-9 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold text-lg cursor-pointer"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip
                content={theme === 'flat' ? 'Switch to 3D View' : 'Switch to 2D View'}
                placement="bottom"
              >
                <button
                  onClick={onToggleTheme}
                  className="bg-slate-800/90 text-white px-3 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold text-sm cursor-pointer"
                >
                  {theme === 'flat' ? '3D' : '2D'}
                </button>
              </Tooltip>
            </div>

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
                      <TileComponent
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
                    <PortComponent key={i} port={port} />
                  ))}

                  {/* Edges (Roads) */}
                  {renderEdges.map(edge => {
                    const isPending = pendingPlacement?.type === 'road' && pendingPlacement.id === edge.id;
                    return (
                      <EdgeRenderer
                        key={edge.id}
                        edge={edge}
                        size={hexSize}
                        color={gameState.players.find(p => p.id === edge.owner)?.color}
                        onClick={onEdgeClick}
                        isValid={validation.validEdges.has(edge.id)}
                        theme={theme}
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
                        theme={theme}
                        isMoving={isMoving}
                        onCancelMove={onCancelBuild}
                        currentPlayerId={playerId}
                        showCancelIcon={isEngineerCancel || isMedicineCancel || isSmithCancel}
                        cancelIconTitle={isMedicineCancel ? 'Cancel Medicine' : 'Cancel Smithing'}
                        isSelectedForAction={
                          isEngineerSelected ||
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
