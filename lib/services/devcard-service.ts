import type { DevCardPlayOptions, DevCardType, GameState } from '@/lib/types';
import type { ResourceType } from '@/core/rules/board-constants';
import { isRoadBuildingEffect, type RoadBuildingEffect } from '@/lib/types/effects';
import { getGameStateByRoomId } from '@/lib/repositories/game-repository';
import { persistGameState } from '@/lib/services/game-persistence-service';
import { canAfford, deductCost } from '@/core/rules/building-costs';
import { updateLongestRoadIncremental } from '@/core/engine/scoring/longest-road';
import { updateLargestArmy } from '@/core/engine/scoring/largest-army';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { checkAndUpdateVictory } from '@/lib/services/game-service';
import { isValidMainPhaseRoad } from '@/core/validation/building-validator';
import { setPhase } from '@/lib/services/timer-service';
import { recordTheftEvent } from '@/core/engine/theft-events';

/**
 * Development Card Service
 * Orchestrates dev card operations (buying, playing, bonus roads)
 */

/**
 * Buy a development card
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @returns Updated game state
 */
export async function buyDevCard(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot buy dev card in current phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate resources (Sheep, Wheat, Ore)
    const devCardCost: Record<ResourceType, number> = {
        sheep: 1,
        wheat: 1,
        ore: 1,
        wood: 0,
        brick: 0
    };

    if (!canAfford(player.resources, devCardCost)) {
        throw new Error('Not enough resources');
    }

    // Validate deck
    if (gameState.devCardDeck.length === 0) {
        throw new Error('No development cards left');
    }

    // Deduct resources
    deductCost(player.resources, devCardCost);

    // Draw card
    const card = gameState.devCardDeck.pop();
    if (!card) throw new Error('Deck error');

    if (!card) throw new Error('Deck error');

    if (!player.devCardsBoughtThisTurn) {
        player.devCardsBoughtThisTurn = [];
    }
    player.devCardsBoughtThisTurn.push(card);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} bought a development card`,
        playerId
    });

    // Save to database
    await persistGameState(gameState);

    return gameState;
}

/**
 * Play a development card
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param cardType - Type of dev card to play
 * @param options - Optional card-specific parameters
 * @returns Updated game state
 */
export async function playDevCard(
    roomId: string,
    playerId: string,
    cardType: DevCardType,
    options?: DevCardPlayOptions
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase' && gameState.phase !== 'waiting_for_roll') {
        throw new Error('Cannot play dev card in current phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate one card per turn rule (except VP cards)
    if (cardType !== 'victory_point' && player.hasPlayedDevCard) {
        throw new Error('You can only play one development card per turn');
    }

    // Validate card ownership
    // Note: Cards bought this turn are in devCardsBoughtThisTurn, so this check implicitly prevents playing them
    if (!player.devCards[cardType] || player.devCards[cardType] <= 0) {
        throw new Error(`You do not have a ${cardType} card`);
    }

    // Execute card effect
    let logMessage = `${player.name} played a ${cardType.replace(/_/g, ' ')} card`;

    switch (cardType) {
        case 'knight':
            // C&K Rule: Robber cannot move before first barbarian attack
            if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
                throw new Error('Cannot move the robber before the first barbarian attack');
            }
            player.knightsPlayed = (player.knightsPlayed || 0) + 1;
            updateLargestArmy(gameState);
            gameState.phase = 'robber_placement';
            logMessage += '. Move the robber.';
            break;

        case 'victory_point':
            player.revealedDevCardVictoryPoints = (player.revealedDevCardVictoryPoints || 0) + 1;
            logMessage += '. +1 Victory Point!';
            break;

        case 'road_building':
            gameState.phase = 'road_building_1';
            logMessage += '. Place your first road.';
            break;

        case 'year_of_plenty':
            if (!options?.resource1 || !options?.resource2) {
                throw new Error('Must select 2 resources');
            }
            player.resources[options.resource1]++;
            player.resources[options.resource2]++;
            logMessage += `. Received ${options.resource1} and ${options.resource2}.`;
            break;

        case 'monopoly':
            if (!options?.monopolyResource) {
                throw new Error('Must select a resource to monopolize');
            }
            const targetRes = options.monopolyResource;
            let stolenCount = 0;

            // Track victims for notification
            const monopolyVictims: { victimId: string; amount: number }[] = [];

            gameState.players.forEach(p => {
                if (p.id !== playerId) {
                    const amount = p.resources[targetRes];
                    if (amount > 0) {
                        p.resources[targetRes] = 0;
                        stolenCount += amount;
                        monopolyVictims.push({ victimId: p.id, amount });
                    }
                }
            });

            player.resources[targetRes] += stolenCount;
            logMessage += `. Stole ${stolenCount} ${targetRes} from other players.`;

            // Record theft for UI notifications
            if (monopolyVictims.length > 0) {
                recordTheftEvent(gameState, {
                    source: 'monopoly',
                    thiefId: playerId,
                    items: [{ type: 'resource', value: targetRes, count: stolenCount }],
                    victims: monopolyVictims.map(v => ({
                        victimId: v.victimId,
                        items: [{ type: 'resource', value: targetRes, count: v.amount }]
                    })),
                });
            }
            break;
    }

    // Decrement card count
    player.devCards[cardType]--;

    // Mark card as played for this turn (except VP cards)
    if (cardType !== 'victory_point') {
        player.hasPlayedDevCard = true;
    }

    // Recalculate all victory points (covers victory_point cards and largest army changes)
    updateAllVictoryPoints(gameState);

    // Check victory
    checkAndUpdateVictory(gameState);

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: logMessage,
        playerId
    });

    // Save to database
    await persistGameState(gameState);

    return gameState;
}

/**
 * Place a bonus road from the Road Building dev card
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param edgeId - Edge ID to place road
 * @returns Updated game state
 */
export async function placeBonusRoad(
    roomId: string,
    playerId: string,
    edgeId: string
): Promise<GameState> {
    // Get game state
    let gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // A dropped response or a double-click can retry a placement after the
    // server has already committed it. The action is scoped to Road Building,
    // so treating an already-owned road as a successful no-op keeps retries
    // from surfacing a false placement error.
    const edge = gameState.board.edges[edgeId];
    if (edge?.owner === playerId && edge.structure === 'road') {
        return gameState;
    }

    // Validate phase
    if (gameState.phase !== 'road_building_1' && gameState.phase !== 'road_building_2') {
        throw new Error('Not in road building phase');
    }

    // Validate placement
    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    const activeEffects = gameState.activeEffects ?? [];
    const roadBuildingEffect = activeEffects.find(
        (effect): effect is RoadBuildingEffect =>
            isRoadBuildingEffect(effect) && effect.playerId === playerId
    );

    // Check roads remaining
    if (player.roadsRemaining <= 0) {
        throw new Error('No roads remaining');
    }

    // Place road
    player.roadsRemaining--;
    edge.owner = playerId;
    edge.structure = 'road';

    if (roadBuildingEffect) {
        if (!Array.isArray(roadBuildingEffect.placedEdges)) {
            roadBuildingEffect.placedEdges = [];
        }
        if (!roadBuildingEffect.placedEdges.includes(edgeId)) {
            roadBuildingEffect.placedEdges.push(edgeId);
        }
    }

    // Update longest road incrementally (only checks affected player)
    updateLongestRoadIncremental(gameState, playerId);

    // Recalculate all victory points
    updateAllVictoryPoints(gameState);

    // Check victory
    checkAndUpdateVictory(gameState);

    // Update phase
    if (gameState.phase === 'road_building_1') {
        // Check if player has more roads
        if (player.roadsRemaining > 0) {
            gameState.phase = 'road_building_2';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${player.name} placed first bonus road`,
                playerId
            });
        } else {
            gameState = setPhase(gameState, 'main_phase');
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${player.name} finished road building (no roads left)`,
                playerId
            });
        }
    } else {
        gameState = setPhase(gameState, 'main_phase');
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} finished road building`,
            playerId
        });
    }

    if (roadBuildingEffect) {
        roadBuildingEffect.completed = gameState.phase === 'main_phase';
    }

    // Save to database
    await persistGameState(gameState);

    return gameState;
}
