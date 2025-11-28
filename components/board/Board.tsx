'use client';

import React, { useState, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { useThemeStore } from '@/lib/theme-store';
import { generatePorts } from '@/engine/generatePorts';
import { GameState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { useTransition } from 'react';
import { placeSettlement, placeRoad, moveRobber, buildRoad, buildSettlement, buildCity, placeBonusRoad, buildKnight, buildCityWall, relocateKnight } from '@/app/actions';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';
import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/core/validation/building-validator';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { useOptimisticAction } from '@/lib/hooks/useOptimisticGameState';
import { getAdjacentEdgesForVertex, getEdgeEndpoints, getAdjacentVertexIds } from '@/lib/hex';

import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';

interface BoardProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null;
    onCancelBuild: () => void;
    movingKnightId?: string | null;
    buildingMetropolisType?: 'science' | 'trade' | 'politics' | null;
    selectingHexForCard?: 'merchant' | 'irrigation' | 'mining' | 'inventor' | null;
    selectingVertexForCard?: 'intrigue' | 'diplomat' | null;
    selectingEdgeForCard?: null;
    onHexSelected?: (hexId: string) => void;
    onVertexSelectedForCard?: (vertexId: string) => void;
    onEdgeSelectedForCard?: (edgeId: string) => void;
    onCityClick?: (vertexId: string) => void;
    onKnightClick?: (knightId: string) => void;
}

export const Board: React.FC<BoardProps> = ({
    gameState,
    playerId,
    buildMode,
    onCancelBuild,
    movingKnightId,
    buildingMetropolisType,
    selectingHexForCard,
    selectingVertexForCard,
    selectingEdgeForCard,
    onHexSelected,
    onVertexSelectedForCard,
    onEdgeSelectedForCard,
    onCityClick,
    onKnightClick
}) => {
    const { theme, toggleTheme } = useThemeStore();
    const HEX_SIZE = 90;

    const ports = useMemo(() => generatePorts(HEX_SIZE), [HEX_SIZE]);

    const tiles = gameState.board.hexes;
    const vertices = Object.values(gameState.board.vertices);
    const edges = Object.values(gameState.board.edges);

    // Sort tiles for Voxel rendering (Painter's Algorithm: Top -> Bottom)
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
        return a.hex.q - b.hex.q;
    });

    const TileComponent = theme === 'flat' ? FlatHexTile : VoxelHexTile;
    const PortComponent = theme === 'flat' ? FlatPort : VoxelPort;

    const [isPending, startTransition] = useTransition();
    const performOptimisticAction = useOptimisticAction();

    const knightsMap = useMemo(() => {
        const map = new Map<string, Knight>();
        gameState.players.forEach(p => {
            p.knights?.forEach(k => {
                map.set(k.vertexId, k);
            });
        });
        return map;
    }, [gameState.players]);

    // Calculate valid placements for highlighting
    const validVertices = useMemo(() => {
        const valid = new Set<string>();

        // Knight Displacement Mode - Must be checked FIRST before currentTurn check
        // The displaced player needs to relocate even if it's not their turn
        if (gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId) {
            const originVertexId = gameState.pendingDisplacement.originVertexId;
            const targets = getValidRelocationTargets(gameState, playerId, originVertexId);
            targets.forEach((t: string) => valid.add(t));
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

        // Progress Card Vertex Selection (Intrigue)
        if (selectingVertexForCard === 'intrigue') {
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

        // Progress Card Vertex Selection (Diplomat)
        if (selectingVertexForCard === 'diplomat') {
            // Diplomat: Move own knight to any own settlement or city
            // Valid vertices are those with player's own settlements or cities
            vertices.forEach(v => {
                const vertex = gameState.board.vertices[v.id];
                if (vertex && vertex.structure && vertex.owner === playerId) {
                    valid.add(v.id);
                }
            });
            return valid;
        }

        if (gameState.phase.startsWith('setup')) {
            vertices.forEach(v => {
                if (isValidSetupSettlement(gameState, v.id, playerId)) {
                    valid.add(v.id);
                }
            });
        } else if (gameState.phase === 'main_phase') {
            if (!buildMode && !movingKnightId && !selectingVertexForCard && !buildingMetropolisType) {
                // Highlight own cities and metropolises for management
                // Also highlight own knights for management
                vertices.forEach(v => {
                    const isOwnCity = v.owner === playerId && (v.structure === 'city' || v.structure === 'metropolis');
                    const hasOwnKnight = knightsMap.has(v.id) && knightsMap.get(v.id)?.playerId === playerId;

                    if (isOwnCity || hasOwnKnight) {
                        valid.add(v.id);
                    }
                });
            }

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
    }, [gameState, playerId, buildMode, vertices, movingKnightId, buildingMetropolisType, selectingVertexForCard]);

    const validEdges = useMemo(() => {
        const valid = new Set<string>();
        if (gameState.currentTurn !== playerId) return valid;

        if (gameState.phase.startsWith('setup')) {
            edges.forEach(e => {
                if (isValidSetupRoad(gameState, e.id, playerId)) {
                    valid.add(e.id);
                }
            });
        } else if (gameState.phase === 'main_phase' && buildMode === 'road') {
            edges.forEach(e => {
                if (isValidMainPhaseRoad(gameState, e.id, playerId)) {
                    valid.add(e.id);
                }
            });
        } else if (gameState.phase === 'road_building_1' || gameState.phase === 'road_building_2') {
            edges.forEach(e => {
                if (isValidMainPhaseRoad(gameState, e.id, playerId)) {
                    valid.add(e.id);
                }
            });
        }
        return valid;
    }, [gameState, playerId, buildMode, edges, selectingEdgeForCard]);

    // Valid hexes for progress card selection


    const validHexes = useMemo(() => {
        const valid = new Set<string>();
        if (gameState.currentTurn !== playerId) return valid;
        if (gameState.phase === 'robber_placement') {
            tiles.forEach(hex => {
                if (hex.id !== gameState.robberHexId) {
                    valid.add(hex.id);
                }
            });
            return valid;
        }

        if (!selectingHexForCard) return valid;

        const currentPlayer = gameState.players.find(p => p.id === playerId);
        if (!currentPlayer) return valid;

        tiles.forEach(hex => {
            switch (selectingHexForCard) {
                case 'merchant':
                    // Hex must be adjacent to player's settlement/city
                    const hasAdjacentSettlement = (hex.vertices || []).some((vertexId: string) => {
                        const vertex = gameState.board.vertices[vertexId];
                        return vertex && vertex.owner === playerId && vertex.structure;
                    });
                    if (hasAdjacentSettlement && hex.terrain !== 'desert' && hex.terrain !== 'ocean') {
                        valid.add(hex.id);
                    }
                    break;

                case 'irrigation':
                    // Must be field hex where player has settlement/city
                    if (hex.terrain === 'field') {
                        const hasPlayerStructure = (hex.vertices || []).some((vertexId: string) => {
                            const vertex = gameState.board.vertices[vertexId];
                            return vertex && vertex.owner === playerId && vertex.structure;
                        });
                        if (hasPlayerStructure) {
                            valid.add(hex.id);
                        }
                    }
                    break;

                case 'mining':
                    // Must be mountain hex where player has settlement/city
                    if (hex.terrain === 'mountain') {
                        const hasPlayerStructure = (hex.vertices || []).some((vertexId: string) => {
                            const vertex = gameState.board.vertices[vertexId];
                            return vertex && vertex.owner === playerId && vertex.structure;
                        });
                        if (hasPlayerStructure) {
                            valid.add(hex.id);
                        }
                    }
                    break;

                case 'inventor':
                    // Any hex with a number token
                    if (hex.numberToken && hex.terrain !== 'desert') {
                        valid.add(hex.id);
                    }
                    break;
            }
        });

        return valid;
    }, [gameState, playerId, selectingHexForCard, tiles]);

    const handleVertexClick = (vertexId: string) => {
        if (isPending) return;

        // Allow viewing city details even if not current turn
        // Also allow viewing knight details
        const vertex = gameState.board.vertices[vertexId];
        const isOwnCity = vertex && (vertex.structure === 'city' || vertex.structure === 'metropolis') && vertex.owner === playerId;
        const isOwnKnight = knightsMap.has(vertexId) && knightsMap.get(vertexId)?.playerId === playerId;

        // Allow displaced player to relocate their knight even if it's not their turn
        const isDisplacedPlayer = gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId;

        if (gameState.currentTurn !== playerId && !isOwnCity && !isOwnKnight && !isDisplacedPlayer) return;

        // Progress Card Vertex Selection
        if (selectingVertexForCard && onVertexSelectedForCard) {
            if (validVertices.has(vertexId)) {
                onVertexSelectedForCard(vertexId);
            }
            return;
        }

        // Knight Movement Mode
        if (movingKnightId) {
            const { isValidKnightMovement } = require('@/core/validation/knight-validator');
            if (isValidKnightMovement(gameState, movingKnightId, vertexId, playerId)) {
                startTransition(async () => {
                    try {
                        const res = await fetch(`/api/game/${gameState.roomId}/knight`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                playerId,
                                action: 'move',
                                knightId: movingKnightId,
                                targetVertexId: vertexId
                            })
                        });
                        if (!res.ok) throw new Error('Failed to move knight');
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to move knight", e);
                    }
                });
            }
            return;
        }

        // Metropolis Building Mode
        if (buildingMetropolisType) {
            const { isValidMetropolisPlacement } = require('@/core/validation/metropolis-validator');
            if (isValidMetropolisPlacement(gameState, vertexId, playerId, buildingMetropolisType)) {
                startTransition(async () => {
                    try {
                        const res = await fetch(`/api/game/${gameState.roomId}/metropolis`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                playerId,
                                action: 'build',
                                vertexId,
                                metropolisType: buildingMetropolisType
                            })
                        });
                        if (!res.ok) throw new Error('Failed to build metropolis');
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build metropolis", e);
                    }
                });
            }
            return;
        }

        // Handle knight click (for activation/movement UI)
        const knight = knightsMap.get(vertexId);
        if (knight && onKnightClick && !buildMode && !movingKnightId && !selectingVertexForCard && !buildingMetropolisType) {
            // Only allow knight interaction if it's my turn (or if we want to view knight details later)
            if (gameState.currentTurn === playerId) {
                onKnightClick(knight.id);
                return;
            }
        }

        if (gameState.phase.startsWith('setup')) {
            if (isValidSetupSettlement(gameState, vertexId, playerId)) {
                // performOptimisticAction({ type: 'PLACE_SETTLEMENT', vertexId, playerId });
                startTransition(async () => {
                    try {
                        await placeSettlement(gameState.roomId, playerId, vertexId);
                    } catch (e) {
                        console.error("Failed to place settlement", e);
                    }
                });
            }
        } else if (gameState.phase === 'knight_displacement') {
            if (validVertices.has(vertexId)) {
                startTransition(async () => {
                    try {
                        await relocateKnight(gameState.roomId, playerId, gameState.pendingDisplacement!.knightId, vertexId);
                    } catch (e) {
                        console.error("Failed to relocate knight", e);
                    }
                });
            }
        } else if (gameState.phase === 'main_phase') {
            if (buildMode === 'settlement' && isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
                // performOptimisticAction({ type: 'BUILD_SETTLEMENT', vertexId, playerId });
                startTransition(async () => {
                    try {
                        await buildSettlement(gameState.roomId, playerId, vertexId);
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build settlement", e);
                    }
                });
            } else if (buildMode === 'city' && isValidMainPhaseCity(gameState, vertexId, playerId)) {
                // performOptimisticAction({ type: 'BUILD_CITY', vertexId, playerId });
                startTransition(async () => {
                    try {
                        await buildCity(gameState.roomId, playerId, vertexId);
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build city", e);
                    }
                });
            } else if (buildMode === 'knight' && isValidKnightPlacement(gameState, vertexId, playerId)) {
                startTransition(async () => {
                    try {
                        await buildKnight(gameState.roomId, playerId, vertexId);
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build knight", e);
                    }
                });
            } else if (buildMode === 'city_wall' && canBuildCityWall(gameState, vertexId, playerId)) {
                // City walls are per-city
                startTransition(async () => {
                    try {
                        await buildCityWall(gameState.roomId, playerId, vertexId);
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build city wall", e);
                    }
                });
            } else if (!buildMode && !movingKnightId && !selectingVertexForCard && !buildingMetropolisType) {
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
                }
            }
        }
    };

    const handleEdgeClick = (edgeId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        // Progress Card Edge Selection
        if (selectingEdgeForCard && onEdgeSelectedForCard) {
            if (validEdges.has(edgeId)) {
                onEdgeSelectedForCard(edgeId);
            }
            return;
        }

        if (gameState.phase.startsWith('setup')) {
            if (isValidSetupRoad(gameState, edgeId, playerId)) {
                // performOptimisticAction({ type: 'PLACE_ROAD', edgeId, playerId });
                startTransition(async () => {
                    try {
                        await placeRoad(gameState.roomId, playerId, edgeId);
                    } catch (e) {
                        console.error("Failed to place road", e);
                    }
                });
            }
        } else if (gameState.phase === 'main_phase' && buildMode === 'road') {
            if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
                // performOptimisticAction({ type: 'BUILD_ROAD', edgeId, playerId });
                startTransition(async () => {
                    try {
                        await buildRoad(gameState.roomId, playerId, edgeId);
                        onCancelBuild();
                    } catch (e) {
                        console.error("Failed to build road", e);
                    }
                });
            }
        } else if (gameState.phase === 'road_building_1' || gameState.phase === 'road_building_2') {
            if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
                startTransition(async () => {
                    try {
                        await placeBonusRoad(gameState.roomId, playerId, edgeId);
                    } catch (e) {
                        console.error("Failed to place bonus road", e);
                    }
                });
            }
        }
    };

    const handleHexClick = (hexId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        // Progress card hex selection
        if (selectingHexForCard && onHexSelected) {
            if (validHexes.has(hexId)) {
                onHexSelected(hexId);
            }
            return;
        }

        // Robber placement
        if (gameState.phase === 'robber_placement') {
            startTransition(async () => {
                try {
                    await moveRobber(gameState.roomId, playerId, hexId);
                } catch (e) {
                    console.error("Failed to move robber", e);
                }
            });
        }
    };

    const [zoomLevel, setZoomLevel] = useState(0.8);

    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={1.3}
                centerOnInit
                limitToBounds={false}
                onTransformed={(ref) => {
                    setZoomLevel(ref.state.scale);
                }}
            >
                {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                    <>
                        {/* Theme Toggle & Zoom Controls */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
                            <details className="group" open>
                                <summary className="list-none cursor-pointer bg-slate-800 text-white px-3 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold flex items-center gap-2 w-fit">
                                    <span>Map Controls</span>
                                    <span className="group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="flex flex-col gap-2 mt-2 p-2 bg-slate-900/80 rounded border border-slate-700 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 justify-between w-full">
                                        <button
                                            onClick={() => zoomIn()}
                                            className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600 transition-colors"
                                            title="Zoom In"
                                        >
                                            ➕
                                        </button>
                                        <button
                                            onClick={() => zoomOut()}
                                            className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600 transition-colors"
                                            title="Zoom Out"
                                        >
                                            ➖
                                        </button>
                                        <button
                                            onClick={() => resetTransform()}
                                            className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600 transition-colors"
                                            title="Reset View"
                                        >
                                            🔄
                                        </button>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold"
                                    >
                                        {theme === 'flat' ? 'Switch to 3D' : 'Switch to 2D'}
                                    </button>
                                </div>
                            </details>
                        </div>

                        <TransformComponent
                            wrapperClass="w-full h-full"
                            contentClass="w-full h-full"
                            wrapperStyle={{ width: "100%", height: "100%" }}
                            contentStyle={{ width: "100%", height: "100%" }}
                        >
                            <div className="relative w-full h-full flex items-center justify-center">
                                <svg id="board-svg" className="overflow-visible" width="100%" height="100%" viewBox="-500 -500 1000 1000">
                                    {/* Hex Grid */}
                                    {sortedTiles.map((tile) => {
                                        const isRolled = gameState.diceRoll && tile.numberToken === gameState.diceRoll.total;
                                        return (
                                            <TileComponent
                                                key={tile.id}
                                                hex={tile.hex}
                                                terrain={tile.terrain}
                                                numberToken={tile.numberToken}
                                                hasRobber={gameState.robberHexId === tile.id}
                                                size={HEX_SIZE}
                                                onClick={() => handleHexClick(tile.id)}
                                                isRolled={isRolled}
                                                isValid={validHexes.has(tile.id)}
                                            />
                                        );
                                    })}

                                    {/* Ports */}
                                    {ports.map((port, i) => (
                                        <PortComponent key={i} port={port} />
                                    ))}

                                    {/* Edges (Roads) */}
                                    {edges.map(edge => (
                                        <EdgeRenderer
                                            key={edge.id}
                                            edge={edge}
                                            size={HEX_SIZE}
                                            color={gameState.players.find(p => p.id === edge.owner)?.color}
                                            onClick={handleEdgeClick}
                                            isValid={validEdges.has(edge.id)}
                                            theme={theme}
                                        />
                                    ))}

                                    {/* Vertices (Settlements/Cities) */}
                                    {vertices.map(vertex => {
                                        const knight = knightsMap.get(vertex.id);
                                        const isMoving = knight && knight.id === movingKnightId;
                                        return (
                                            <VertexRenderer
                                                key={vertex.id}
                                                vertex={vertex}
                                                knight={knight}
                                                size={HEX_SIZE}
                                                color={gameState.players.find(p => p.id === vertex.owner)?.color}
                                                onClick={handleVertexClick}
                                                isValid={validVertices.has(vertex.id)}
                                                theme={theme}
                                                isMoving={isMoving}
                                                onCancelMove={onCancelBuild}
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

