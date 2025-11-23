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
import { placeSettlement, placeRoad, moveRobber } from '@/app/actions';
import { isValidSetupSettlement, isValidSetupRoad } from '@/lib/game-logic';

interface BoardProps {
    gameState: GameState;
    playerId: string;
}

export const Board: React.FC<BoardProps> = ({ gameState, playerId }) => {
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

    const handleVertexClick = (vertexId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        // Client-side validation
        if (!isValidSetupSettlement(gameState, vertexId, playerId)) {
            console.log("Invalid settlement placement");
            return;
        }

        startTransition(async () => {
            try {
                await placeSettlement(gameState.roomId, playerId, vertexId);
            } catch (e) {
                console.error("Failed to place settlement", e);
            }
        });
    };

    const handleEdgeClick = (edgeId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;

        if (!isValidSetupRoad(gameState, edgeId, playerId)) {
            console.log("Invalid road placement");
            return;
        }

        startTransition(async () => {
            try {
                await placeRoad(gameState.roomId, playerId, edgeId);
            } catch (e) {
                console.error("Failed to place road", e);
            }
        });
    };

    const handleHexClick = (hexId: string) => {
        if (isPending) return;
        if (gameState.currentTurn !== playerId) return;
        if (gameState.phase !== 'robber_placement') return;

        startTransition(async () => {
            try {
                await moveRobber(gameState.roomId, playerId, hexId);
            } catch (e) {
                console.error("Failed to move robber", e);
            }
        });
    };

    return (
        <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
            <TransformWrapper
                initialScale={1}
                initialPositionX={0}
                initialPositionY={0}
                centerOnInit
                minScale={0.5}
                maxScale={4}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start">
                            <div className="flex gap-2">
                                <button onClick={() => zoomIn()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold w-10">+</button>
                                <button onClick={() => zoomOut()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold w-10">-</button>
                                <button onClick={() => resetTransform()} className="bg-white/90 p-2 rounded shadow hover:bg-white text-black font-bold px-4">Reset</button>
                            </div>

                            <button
                                onClick={toggleTheme}
                                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-500 font-bold transition-colors"
                            >
                                Switch to {theme === 'flat' ? 'Voxel' : 'Flat'} Theme
                            </button>
                        </div>

                        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                            <div className="w-full h-full flex items-center justify-center">
                                <svg width="1000" height="1000" viewBox="-500 -500 1000 1000" className="overflow-visible">
                                    <g>
                                        {ports.map(port => (
                                            <PortComponent key={port.id} port={port} />
                                        ))}

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

                                        {edges.map(edge => (
                                            <EdgeRenderer
                                                key={edge.id}
                                                edge={edge}
                                                size={HEX_SIZE}
                                                color={gameState.players.find(p => p.id === edge.owner)?.color}
                                                onClick={handleEdgeClick}
                                                isValid={isValidSetupRoad(gameState, edge.id, playerId)}
                                                theme={theme}
                                            />
                                        ))}

                                        {vertices.map(vertex => (
                                            <VertexRenderer
                                                key={vertex.id}
                                                vertex={vertex}
                                                size={HEX_SIZE}
                                                color={gameState.players.find(p => p.id === vertex.owner)?.color}
                                                onClick={handleVertexClick}
                                                isValid={isValidSetupSettlement(gameState, vertex.id, playerId)}
                                                theme={theme}
                                            />
                                        ))}
                                    </g>
                                </svg>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};
