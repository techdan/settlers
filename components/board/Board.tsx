'use client';

import React, { useState, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { HexTile as FlatHexTile } from '@/themes/flat/HexTile';
import { VoxelHexTile } from '@/themes/voxel/HexTile';
import { FlatPort } from '@/themes/flat/Port';
import { VoxelPort } from '@/themes/voxel/Port';
import { useThemeStore } from '@/lib/theme-store';
import { Tooltip } from '@/components/ui/tooltip';
import { generatePorts } from '@/engine/generatePorts';
import { GameState, EMPTY_DICE_STATS, EMPTY_EVENT_DIE_STATS } from '@/lib/types';
import { Knight, ProgressCardType } from '@/lib/types/player';
import { VertexRenderer } from './VertexRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { useTransition } from 'react';
import { placeSettlement, placeRoad, moveRobber, buildRoad, buildSettlement, buildCity, placeBonusRoad, buildKnight, buildCityWall, relocateKnight } from '@/app/actions';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';
import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/core/validation/building-validator';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { useOptimisticAction } from '@/lib/hooks/useOptimisticGameState';
import { getAdjacentEdgesForVertex, getEdgeEndpoints, getAdjacentVertexIds, getCanonicalVertexId } from '@/lib/hex';

import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';
import { getOpenRoadIds } from '@/core/validation/diplomat-validator';

interface BoardProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null;
    onCancelBuild: () => void;
    movingKnightId?: string | null;
    buildingMetropolisType?: 'science' | 'trade' | 'politics' | null;
    selectingHexForCard?: 'merchant' | 'inventor' | 'taxation' | null;
    selectingVertexForCard?: 'intrigue' | 'treason_remove' | 'treason_place' | null;
    treasonSelectedKnightId?: string | null;
    treasonSelectedPlacementVertexId?: string | null;
    selectingEdgeForCard?: 'diplomat' | null;
    selectingCityForEngineer?: boolean;
    selectedEngineerCityId?: string | null;
    selectingCityForMedicine?: boolean;
    selectingCityForMetropolis?: 'science' | 'trade' | 'politics' | null;
    selectedMetropolisCityId?: string | null;
    intrigueSelectedKnightId?: string | null;
    selectingKnightsForSmith?: boolean;
    smithSelectableKnightIds?: string[];
    smithSelectedKnightIds?: string[];
    progressPromptCardType?: ProgressCardType | null;
    progressPromptVisible?: boolean;
    progressPromptReady?: boolean;
    inventorSelection?: { firstHexId?: string; secondHexId?: string } | null;
    merchantSelectedHexId?: string | null;
    taxationSelectedHexId?: string | null;
    diplomatStage?: 'remove' | 'rebuild' | null;
    diplomatRemovedEdgeId?: string | null;
    diplomatRelocatedEdgeId?: string | null;
    onHexSelected?: (hexId: string) => void;
    onVertexSelectedForCard?: (vertexId: string) => void;
    onEdgeSelectedForCard?: (edgeId: string) => void;
    onEngineerCitySelected?: (vertexId: string) => void;
    onMedicineCitySelected?: (vertexId: string) => void;
    onMetropolisCitySelected?: (vertexId: string) => void;
    onCityClick?: (vertexId: string) => void;
    onKnightClick?: (knightId: string) => void;
    onBarbarianCitySelect?: (vertexId: string) => void;
}

const getHexVertexIds = (hexId: string): string[] => {
    const [q, r] = hexId.split(',').map(Number);
    if (Number.isNaN(q) || Number.isNaN(r)) return [];
    return Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));
};

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
    selectingCityForEngineer,
    selectedEngineerCityId,
    selectingCityForMedicine,
    selectingCityForMetropolis,
    selectedMetropolisCityId,
    treasonSelectedKnightId,
    treasonSelectedPlacementVertexId,
    intrigueSelectedKnightId,
    selectingKnightsForSmith,
    smithSelectableKnightIds,
    smithSelectedKnightIds,
    progressPromptCardType,
    progressPromptVisible,
    progressPromptReady,
    inventorSelection,
    merchantSelectedHexId,
    taxationSelectedHexId,
    diplomatStage,
    diplomatRemovedEdgeId,
    diplomatRelocatedEdgeId,
    onHexSelected,
    onVertexSelectedForCard,
    onEdgeSelectedForCard,
    onEngineerCitySelected,
    onMedicineCitySelected,
    onMetropolisCitySelected,
    onCityClick,
    onKnightClick,
    onBarbarianCitySelect
}) => {
    const { theme, toggleTheme } = useThemeStore();
    const HEX_SIZE = 90;

    const ports = useMemo(() => generatePorts(HEX_SIZE), [HEX_SIZE]);

    const tiles = gameState.board.hexes;
    const vertices = Object.values(gameState.board.vertices);
    const edges = Object.values(gameState.board.edges);

    const renderEdges = useMemo(() => {
        if (selectingEdgeForCard !== 'diplomat' || !diplomatStage) return edges;

        return edges.map(edge => {
            if (diplomatStage === 'rebuild' && diplomatRemovedEdgeId && edge.id === diplomatRemovedEdgeId) {
                return { ...edge, owner: null, structure: null };
            }
            if (diplomatStage === 'rebuild' && diplomatRelocatedEdgeId && edge.id === diplomatRelocatedEdgeId) {
                return { ...edge, owner: playerId, structure: 'road' as const };
            }
            return edge;
        });
    }, [edges, diplomatStage, diplomatRemovedEdgeId, diplomatRelocatedEdgeId, playerId, selectingEdgeForCard]);

    // Sort tiles for Voxel rendering (Painter's Algorithm: Top -> Bottom)
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.hex.r !== b.hex.r) return a.hex.r - b.hex.r;
        return a.hex.q - b.hex.q;
    });

    const TileComponent = theme === 'flat' ? FlatHexTile : VoxelHexTile;
    const PortComponent = theme === 'flat' ? FlatPort : VoxelPort;

    const [isPending, startTransition] = useTransition();
    const [isPlacingBonusRoad, setIsPlacingBonusRoad] = useState(false);
    const performOptimisticAction = useOptimisticAction();
    const diceStats = useMemo(
        () => ({
            ...EMPTY_DICE_STATS,
            ...(gameState.diceStats || {})
        }),
        [gameState.diceStats]
    );
    const eventDiceStats = useMemo(
        () => ({
            ...EMPTY_EVENT_DIE_STATS,
            ...(gameState.eventDieStats || {})
        }),
        [gameState.eventDieStats]
    );

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
        if (selectingVertexForCard === 'treason_remove') {
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
        if (selectingVertexForCard === 'treason_place') {
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

        if (selectingCityForMedicine) {
            vertices.forEach(v => {
                if (isValidMainPhaseCity(gameState, v.id, playerId)) {
                    valid.add(v.id);
                }
            });
            return valid;
        }

        if (selectingKnightsForSmith && smithSelectableKnightIds && smithSelectableKnightIds.length > 0) {
            smithSelectableKnightIds.forEach(id => valid.add(id));
            return valid;
        }

        // Engineering progress card - free city wall placement
        if (selectingCityForEngineer) {
            vertices.forEach(v => {
                if (canBuildCityWall(gameState, v.id, playerId, { ignoreCost: true })) {
                    valid.add(v.id);
                }
            });
            return valid;
        }

        // Metropolis selection - player's cities
        if (selectingCityForMetropolis) {
            vertices.forEach(v => {
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


        if (gameState.phase.startsWith('setup')) {
            vertices.forEach(v => {
                if (isValidSetupSettlement(gameState, v.id, playerId)) {
                    valid.add(v.id);
                }
            });
        } else if (gameState.phase === 'main_phase') {
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
    }, [gameState, playerId, buildMode, vertices, movingKnightId, buildingMetropolisType, selectingVertexForCard, selectingCityForEngineer, selectingCityForMedicine, selectingCityForMetropolis, selectingKnightsForSmith, smithSelectableKnightIds]);

    const diplomatPlacementState = useMemo(() => {
        if (selectingEdgeForCard !== 'diplomat' || diplomatStage !== 'rebuild' || !diplomatRemovedEdgeId) {
            return null;
        }

        if (!gameState) return null;

        const removedEdge = gameState.board.edges[diplomatRemovedEdgeId];
        if (!removedEdge) return null;

        return {
            ...gameState,
            board: {
                ...gameState.board,
                edges: {
                    ...gameState.board.edges,
                    [diplomatRemovedEdgeId]: { ...removedEdge, owner: null, structure: null }
                }
            }
        };
    }, [diplomatRemovedEdgeId, diplomatStage, gameState, selectingEdgeForCard]);

    const validEdges = useMemo(() => {
        const valid = new Set<string>();
        if (gameState.currentTurn !== playerId) return valid;

        // Progress Card Edge Selection (Diplomat)
        if (selectingEdgeForCard === 'diplomat') {
            if (diplomatStage === 'rebuild') {
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

        if (selectingVertexForCard === 'treason_place') {
            vertices.forEach(v => {
                if (isValidKnightPlacement(gameState, v.id, playerId)) {
                    valid.add(v.id);
                }
            });
            return valid;
        }

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
    }, [gameState, playerId, buildMode, edges, selectingEdgeForCard, diplomatStage, diplomatPlacementState]);

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

        // Allow barbarian victim to choose a city to lose
        const isBarbarianVictim = gameState.phase === 'barbarian_city_selection' && gameState.pendingBarbarianVictims?.includes(playerId);

        if (gameState.currentTurn !== playerId && !isOwnCity && !isOwnKnight && !isDisplacedPlayer && !isBarbarianVictim) return;

        // Barbarian City Selection
        if (gameState.phase === 'barbarian_city_selection') {
            if (isOwnCity && onBarbarianCitySelect) {
                onBarbarianCitySelect(vertexId);
            }
            return;
        }

        // Progress Card Vertex Selection
        if (selectingVertexForCard && onVertexSelectedForCard) {
            if (validVertices.has(vertexId)) {
                onVertexSelectedForCard(vertexId);
            }
            return;
        }

        if (selectingCityForMedicine && validVertices.has(vertexId)) {
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

        if (selectingCityForEngineer && validVertices.has(vertexId)) {
            startTransition(async () => {
                try {
                    await onEngineerCitySelected?.(vertexId);
                } catch (e) {
                    console.error('Failed to build city wall with Engineering', e);
                }
            });
            return;
        }

        if (selectingCityForMetropolis && validVertices.has(vertexId)) {
            startTransition(async () => {
                try {
                    await onMetropolisCitySelected?.(vertexId);
                } catch (e) {
                    console.error('Failed to select city for metropolis', e);
                }
            });
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
        if (isPending || isPlacingBonusRoad) return;
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
        } else if (
            (gameState.phase === 'road_building_1' || gameState.phase === 'road_building_2') ||
            (progressPromptVisible && progressPromptCardType === 'road_building_progress')
        ) {
            if (!progressPromptReady && progressPromptCardType === 'road_building_progress') return; // wait until server effect active to avoid errors
            if (isValidMainPhaseRoad(gameState, edgeId, playerId)) {
                setIsPlacingBonusRoad(true);
                (async () => {
                    try {
                        await placeBonusRoad(gameState.roomId, playerId, edgeId);
                    } catch (e) {
                        console.error("Failed to place bonus road", e);
                    } finally {
                        setIsPlacingBonusRoad(false);
                    }
                })();
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
                                {/* Simplified Map Controls: + - 3D */}
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
                                    <Tooltip content={theme === 'flat' ? 'Switch to 3D View' : 'Switch to 2D View'} placement="bottom">
                                        <button
                                            onClick={toggleTheme}
                                            className="bg-slate-800/90 text-white px-3 h-9 rounded shadow-lg hover:bg-slate-700 transition-colors border border-slate-600 font-bold text-sm cursor-pointer"
                                        >
                                            {theme === 'flat' ? '3D' : '2D'}
                                        </button>
                                    </Tooltip>
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
                                        const selectionState =
                                            tile.id === inventorSelection?.firstHexId
                                                ? 'primary'
                                                : tile.id === inventorSelection?.secondHexId
                                                    ? 'secondary'
                                                    : selectingHexForCard === 'merchant' && merchantSelectedHexId === tile.id
                                                        ? 'primary'
                                                        : selectingHexForCard === 'taxation' && taxationSelectedHexId === tile.id
                                                            ? 'primary'
                                                            : null;
                                        const selectionVariant =
                                            selectingHexForCard === 'inventor' || selectingHexForCard === 'merchant' || selectingHexForCard === 'taxation'
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
                                                size={HEX_SIZE}
                                                onClick={() => handleHexClick(tile.id)}
                                                isRolled={isRolled}
                                                isSelectable={validHexes.has(tile.id)}
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
                                    {renderEdges.map(edge => (
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
                                        // Use knight owner's color if knight exists, otherwise vertex owner's color
                                        const ownerColor = knight
                                            ? gameState.players.find(p => p.id === knight.playerId)?.color
                                            : gameState.players.find(p => p.id === vertex.owner)?.color;
                                        const isEngineerCancel = false;
                                        const isMedicineCancel = !!selectingCityForMedicine && validVertices.has(vertex.id);
                                        const isSmithCancel = !!selectingKnightsForSmith && validVertices.has(vertex.id);
                                        const isEngineerSelected = !!(selectingCityForEngineer && selectedEngineerCityId === vertex.id);
                                        const isMetropolisSelected = !!(selectingCityForMetropolis && selectedMetropolisCityId === vertex.id);
                                        const isSmithSelected = !!(selectingKnightsForSmith && knight && smithSelectedKnightIds?.includes(knight.id));
                                        const isIntrigueSelected = !!(selectingVertexForCard === 'intrigue' && knight && intrigueSelectedKnightId === knight.id);
                                        const isTreasonSelected = !!(selectingVertexForCard === 'treason_remove' && knight && treasonSelectedKnightId === knight.id);
                                        const isTreasonPlacementSelected = !!(selectingVertexForCard === 'treason_place' && treasonSelectedPlacementVertexId === vertex.id);
                                        const highlightVariant = selectingVertexForCard === 'treason_place' ? 'treason' : 'default';
                                        return (
                                            <VertexRenderer
                                                key={vertex.id}
                                                vertex={vertex}
                                                knight={knight}
                                                size={HEX_SIZE}
                                                color={ownerColor}
                                                onClick={handleVertexClick}
                                                isValid={validVertices.has(vertex.id)}
                                                theme={theme}
                                                isMoving={isMoving}
                                                onCancelMove={onCancelBuild}
                                                currentPlayerId={playerId}
                                                showCancelIcon={isEngineerCancel || isMedicineCancel || isSmithCancel}
                                                cancelIconTitle={
                                                    isMedicineCancel
                                                        ? 'Cancel Medicine'
                                                        : 'Cancel Smithing'
                                                }
                                                isSelectedForAction={isEngineerSelected || isMetropolisSelected || isSmithSelected || isIntrigueSelected || isTreasonSelected || isTreasonPlacementSelected}
                                                highlightVariant={highlightVariant}
                                                onCancelIconClick={onCancelBuild}
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

