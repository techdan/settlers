import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import {
    isValidMainPhaseRoad,
    isValidMainPhaseSettlement,
    isValidMainPhaseCity
} from '@/core/validation/building-validator';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';
import { BUILDING_COSTS, canAfford, deductCost } from '@/core/rules/building-costs';
import { updateLongestRoadIncremental } from '@/core/engine/scoring/longest-road';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { checkAndUpdateVictory } from '@/lib/services/game-service';
import { getHexesForVertex } from '@/lib/hex';
import { getResourceFromTerrain } from '@/core/rules/game-rules';

/**
 * Building Service
 * Orchestrates building placement operations
 */

/**
 * Build a road during main phase
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param edgeId - Edge ID to place road
 * @returns Updated game state
 */
export async function buildRoad(
    roomId: string,
    playerId: string,
    edgeId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.road)) {
        throw new Error('Insufficient resources');
    }

    // Check roads remaining
    if (player.roadsRemaining <= 0) {
        throw new Error('No roads remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.road);

    // Place road
    player.roadsRemaining--;
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';

    // Update longest road incrementally (only checks affected player)
    updateLongestRoadIncremental(gameState, playerId);

    // Recalculate all victory points
    updateAllVictoryPoints(gameState);

    // Check victory
    checkAndUpdateVictory(gameState);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} built a road`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Build a settlement during main phase
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID to place settlement
 * @returns Updated game state
 */
export async function buildSettlement(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
        throw new Error('Invalid settlement placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.settlement)) {
        throw new Error('Insufficient resources');
    }

    // Check settlements remaining
    if (player.settlementsRemaining <= 0) {
        throw new Error('No settlements remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.settlement);

    // Place settlement
    player.settlementsRemaining--;
    gameState.board.vertices[vertexId].owner = playerId;
    gameState.board.vertices[vertexId].structure = 'settlement';

    // Recalculate all victory points
    updateAllVictoryPoints(gameState);

    // Check victory
    checkAndUpdateVictory(gameState);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} built a settlement`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Upgrade a settlement to a city
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID to upgrade
 * @returns Updated game state
 */
export async function buildCity(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Not in main phase');
    }

    // Validate placement
    if (!isValidMainPhaseCity(gameState, vertexId, playerId)) {
        throw new Error('Invalid city upgrade');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Check resources
    if (!canAfford(player.resources, BUILDING_COSTS.city)) {
        throw new Error('Insufficient resources');
    }

    // Check cities remaining
    if (player.citiesRemaining <= 0) {
        throw new Error('No cities remaining');
    }

    // Deduct resources
    deductCost(player.resources, BUILDING_COSTS.city);

    // Upgrade to city
    player.citiesRemaining--;
    player.settlementsRemaining++; // Return settlement to pool
    gameState.board.vertices[vertexId].structure = 'city';

    // Recalculate all victory points
    updateAllVictoryPoints(gameState);

    // Check victory
    checkAndUpdateVictory(gameState);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} upgraded to a city`,
        playerId
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Place settlement during setup phase
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param vertexId - Vertex ID to place settlement
 * @returns Updated game state
 */
export async function placeInitialSettlement(
    roomId: string,
    playerId: string,
    vertexId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // Validate phase
    if (gameState.phase !== 'setup_round_1_settlement' && gameState.phase !== 'setup_round_2_settlement') {
        throw new Error('Invalid phase for settlement placement');
    }

    // Validate placement
    if (!isValidSetupSettlement(gameState, vertexId, playerId)) {
        throw new Error('Invalid settlement placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // In Cities & Knights, second placement is a city
    const isSecondPlacement = gameState.phase === 'setup_round_2_settlement';
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
    const placeCity = isSecondPlacement && isCitiesAndKnights;

    // Place settlement or city
    gameState.board.vertices[vertexId].owner = playerId;
    gameState.board.vertices[vertexId].structure = placeCity ? 'city' : 'settlement';

    if (placeCity) {
        player.citiesRemaining--;
    } else {
        player.settlementsRemaining--;
    }

    // Store settlement ID for road validation
    gameState.lastPlacedSettlementId = vertexId;

    // Recalculate all victory points
    updateAllVictoryPoints(gameState);

    // In round 2, give resources for placement
    // Setup rule: 1 resource per adjacent hex (no commodities, no double for cities)
    const startingResources: Partial<Record<ResourceType, number>> = {};

    if (isSecondPlacement) {
        const [q, r, d] = vertexId.split(',').map(Number);
        const hexes = getHexesForVertex(q, r, d);
        const resourcesPerHex = 1;

        hexes.forEach(hexCoords => {
            const hex = gameState.board.hexes.find(
                h => h.hex.q === hexCoords.q && h.hex.r === hexCoords.r
            );
            if (!hex) return;

            const resource = getResourceFromTerrain(hex.terrain);
            if (resource) {
                player.resources[resource] += resourcesPerHex;
                startingResources[resource] = (startingResources[resource] || 0) + resourcesPerHex;
            }
        });
    }

    // Update phase
    if (gameState.phase === 'setup_round_1_settlement') {
        gameState.phase = 'setup_round_1_road';
    } else {
        gameState.phase = 'setup_round_2_road';
    }

    // Add log
    const basePlacementMessage = `${player.name} placed a ${placeCity ? 'city' : 'settlement'}`;
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: basePlacementMessage,
        playerId
    });

    if (isSecondPlacement) {
        const resourceParts = Object.entries(startingResources)
            .filter(([, count]) => (count || 0) > 0)
            .map(([resource, count]) => `${count} ${resource}`);

        const message =
            resourceParts.length > 0
                ? `${player.name} received ${resourceParts.join(', ')} from their second ${placeCity ? 'city' : 'settlement'} placement`
                : `${player.name} received no resources from their second ${placeCity ? 'city' : 'settlement'} placement`;

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message,
            playerId
        });
    }

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Place road during setup phase
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param edgeId - Edge ID to place road
 * @returns Updated game state
 */
export async function placeInitialRoad(
    roomId: string,
    playerId: string,
    edgeId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // Validate phase
    if (gameState.phase !== 'setup_round_1_road' && gameState.phase !== 'setup_round_2_road') {
        throw new Error('Invalid phase for road placement');
    }

    // Validate placement
    if (!isValidSetupRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Place road
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';
    player.roadsRemaining--;

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} placed a road`,
        playerId
    });

    // Update phase and turn
    const currentPlayerIndex = gameState.turnOrder.indexOf(playerId);

    if (gameState.phase === 'setup_round_1_road') {
        // Round 1: Move to next player
        if (currentPlayerIndex === gameState.turnOrder.length - 1) {
            // Last player, start round 2 with same player
            gameState.phase = 'setup_round_2_settlement';
        } else {
            // Next player's turn
            gameState.currentTurn = gameState.turnOrder[currentPlayerIndex + 1];
            gameState.phase = 'setup_round_1_settlement';
        }
    } else {
        // Round 2: Move backwards
        if (currentPlayerIndex === 0) {
            // First player, start main game
            gameState.phase = 'waiting_for_roll';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `Setup complete! ${player.name} starts the game.`
            });
        } else {
            // Previous player's turn
            gameState.currentTurn = gameState.turnOrder[currentPlayerIndex - 1];
            gameState.phase = 'setup_round_2_settlement';
        }
    }

    // Clear the last placed settlement ID so the next player (or same player in round 2)
    // starts fresh with a settlement placement
    gameState.lastPlacedSettlementId = null;

    // Save to database
    await updateGameState(gameState);

    return gameState;
}
