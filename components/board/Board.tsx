'use client';

import React, { useState, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { useThemeStore } from '@/lib/theme-store';
import { generatePorts } from '@/engine/generatePorts';
import { GameState } from '@/lib/game-types';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { useTransition } from 'react';
import { placeSettlement, placeRoad, moveRobber, buildRoad, buildSettlement, buildCity, placeBonusRoad } from '@/app/actions';
import { isValidSetupSettlement, isValidSetupRoad, isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/lib/game-logic';

interface BoardProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | null;
    onCancelBuild: () => void;
}

export const Board: React.FC<BoardProps> = ({ gameState, playerId, buildMode, onCancelBuild }) => {
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

    // Calculate valid placements for highlighting
    const validVertices = useMemo(() => {
        const valid = new Set<string>();
        if (gameState.currentTurn !== playerId) return valid;

        if (gameState.phase.startsWith('setup')) {
            vertices.forEach(v => {
                if (isValidSetupSettlement(gameState, v.id, playerId)) {
                    valid.add(v.id);
                }
            });
        } else if (gameState.phase === 'main_phase') {
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
            }
        }
        return valid;
    }, [gameState, playerId, buildMode, vertices]);

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
    }, [gameState, playerId, buildMode, edges]);

    const handleVertexClick = (vertexId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        // Setup Phase
        if (gameState.phase.startsWith('setup')) {
            if (gameState.phase.includes('settlement')) {
                if (isValidSetupSettlement(gameState, vertexId, playerId)) {
                    startTransition(async () => {
                        try {
                            await placeSettlement(gameState.roomId, playerId, vertexId);
                        } catch (e) {
                            console.error("Failed to place settlement", e);
                        }
                    });
                }
            }
        }
        // Main Phase
        else if (gameState.phase === 'main_phase') {
            if (buildMode === 'settlement') {
                if (isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
                    startTransition(async () => {
                        try {
                            await buildSettlement(gameState.roomId, playerId, vertexId);
                            onCancelBuild();
                        } catch (e) {
                            console.error("Failed to build settlement", e);
                        }
                    });
                }
            } else if (buildMode === 'city') {
                if (isValidMainPhaseCity(gameState, vertexId, playerId)) {
                    startTransition(async () => {
                        try {
                            await buildCity(gameState.roomId, playerId, vertexId);
                            onCancelBuild();
                        } catch (e) {
                            console.error("Failed to build city", e);
                        }
                    });
                }
            }
        }
    };

    const handleEdgeClick = (edgeId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        // Setup Phase
        if (gameState.phase.startsWith('setup')) {
            if (gameState.phase.includes('road')) {
                if (isValidSetupRoad(gameState, edgeId, playerId)) {
                    startTransition(async () => {
                        try {
                            await placeRoad(gameState.roomId, playerId, edgeId);
                        } catch (e) {
                            console.error("Failed to place road", e);
                        }
                    });
                }
            }
        }
        // Main Phase
        else if (gameState.phase === 'main_phase') {
            if (buildMode === 'road') {
                if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
                    startTransition(async () => {
                        try {
                            await buildRoad(gameState.roomId, playerId, edgeId);
                            onCancelBuild();
                        } catch (e) {
                            console.error("Failed to build road", e);
                        }
                    });
                }
            }
        }
        // Road Building Bonus
        else if (gameState.phase === 'road_building_1' || gameState.phase === 'road_building_2') {
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
                initialScale={0.8}
                minScale={0.4}
                maxScale={2}
                centerOnInit
                limitToBounds={false}
                onTransformed={(ref) => {
                    setZoomLevel(ref.state.scale);
                }}
            >
                {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                    <>
                        {/* Theme Toggle & Zoom Controls */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => zoomOut()}
                                    className="bg-slate-800 text-white px-3 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold w-10"
                                >
                                    −
                                </button>
                                <input
                                    type="range"
                                    min={0.4}
                                    max={2}
                                    step={0.05}
                                    value={zoomLevel}
                                    onChange={(e) => {
                                        const newScale = parseFloat(e.target.value);
                                        setZoomLevel(newScale);
                                        setTransform(0, 0, newScale);
                                    }}
                                    className="w-32 accent-blue-500"
                                />
                                <button
                                    onClick={() => zoomIn()}
                                    className="bg-slate-800 text-white px-3 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold w-10"
                                >
                                    +
                                </button>
                                <button
                                    onClick={() => {
                                        resetTransform();
                                        setZoomLevel(0.8);
                                    }}
                                    className="bg-slate-800 text-white px-3 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold"
                                >
                                    Reset
                                </button>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold"
                            >
                                {theme === 'flat' ? 'Switch to 3D' : 'Switch to 2D'}
                            </button>
                        </div>

                        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                            <div className="relative w-full h-full flex items-center justify-center">
                                <svg id="board-svg" className="overflow-visible" width={1000} height={1000} viewBox="-500 -500 1000 1000">
                                    {/* Ports */}
                                    {ports.map((port, i) => (
                                        <PortComponent key={i} port={port} />
                                    ))}

                                    {/* Hex Grid */}
                                    {sortedTiles.map((tile) => (
                                        <TileComponent
                                            key={tile.id}
                                            hex={tile.hex}
                                            resource={tile.resource}
                                            numberToken={tile.numberToken}
                                            hasRobber={gameState.robberHexId === tile.id}
                                            size={HEX_SIZE}
                                            onClick={() => handleHexClick(tile.id)}
                                        />
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
                                    {vertices.map(vertex => (
                                        <VertexRenderer
                                            key={vertex.id}
                                            vertex={vertex}
                                            size={HEX_SIZE}
                                            color={gameState.players.find(p => p.id === vertex.owner)?.color}
                                            onClick={handleVertexClick}
                                            isValid={validVertices.has(vertex.id)}
                                            theme={theme}
                                        />
                                    ))}
                                </svg>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};
