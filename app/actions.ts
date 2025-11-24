'use server';

import { redirect } from 'next/navigation';
import { randomUUID, randomInt } from 'crypto';
import * as roomRepository from '@/lib/repositories/room-repository';
import * as playerRepository from '@/lib/repositories/player-repository';

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function createRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    if (!playerName) throw new Error('Player name is required');

    const roomId = generateRoomCode();
    const playerId = randomUUID();

    // Create room using repository
    await roomRepository.createRoom(roomId);

    // Create host player using repository
    await playerRepository.createPlayer(playerId, roomId, playerName, true);

    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function joinRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const roomId = (formData.get('roomId') as string).toUpperCase();

    if (!playerName) throw new Error('Player name is required');
    if (!roomId) throw new Error('Room ID is required');

    // Check if room exists using repository
    const room = await roomRepository.findRoomById(roomId);

    if (!room) {
        throw new Error('Room not found');
    }

    const playerId = randomUUID();

    // Create player using repository
    await playerRepository.createPlayer(playerId, roomId, playerName);

    redirect(`/room/${roomId}?playerId=${playerId}`);
}

import { DevCardType, GameState } from '@/lib/game-types';
import { ResourceType } from '@/lib/board-data';
import { getHexesForVertex, getAdjacentEdgesForVertex, getCanonicalVertexId } from '@/lib/hex';
import * as gameService from '@/lib/services/game-service';
import * as buildingService from '@/lib/services/building-service';
import * as tradingService from '@/lib/services/trading-service';
import * as robberService from '@/lib/services/robber-service';
import { games } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { isValidSetupSettlement, isValidSetupRoad } from '@/lib/game-logic';

export async function startGame(roomId: string) {
    return gameService.startGame(roomId);
}

export async function placeSettlement(roomId: string, playerId: string, vertexId: string) {
    return buildingService.placeInitialSettlement(roomId, playerId, vertexId);
}

export async function placeRoad(roomId: string, playerId: string, edgeId: string) {
    return buildingService.placeInitialRoad(roomId, playerId, edgeId);
}

export async function rollDice(roomId: string, playerId: string) {
    return gameService.rollDice(roomId, playerId);
}

export async function endTurn(roomId: string, playerId: string) {
    return gameService.endTurn(roomId, playerId);
}

export async function moveRobber(roomId: string, playerId: string, hexId: string, victimId?: string) {
    return robberService.moveRobber(roomId, playerId, hexId, victimId);
}

export async function buyDevCard(roomId: string, playerId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot buy dev card in current phase');
    }

    // 2. Validate Resources (Sheep, Wheat, Ore)
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const player = gameState.players[playerIndex];

    if (player.resources.sheep < 1 || player.resources.wheat < 1 || player.resources.ore < 1) {
        throw new Error('Not enough resources');
    }

    // 3. Validate Deck
    if (gameState.devCardDeck.length === 0) {
        throw new Error('No development cards left');
    }

    // 4. Deduct Resources
    player.resources.sheep--;
    player.resources.wheat--;
    player.resources.ore--;

    // 5. Draw Card
    const card = gameState.devCardDeck.pop();
    if (!card) throw new Error('Deck error'); // Should not happen due to check above

    if (!player.devCards[card]) player.devCards[card] = 0;
    player.devCards[card]++;

    // 6. Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} bought a development card.`,
        playerId
    });

    // 7. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function playDevCard(roomId: string, playerId: string, cardType: DevCardType, options?: { resource1?: ResourceType, resource2?: ResourceType, monopolyResource?: ResourceType }) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot play dev card in current phase');
    }

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const player = gameState.players[playerIndex];

    // 2. Validate Card Ownership
    if (!player.devCards[cardType] || player.devCards[cardType] <= 0) {
        throw new Error(`You do not have a ${cardType} card`);
    }

    // 3. Execute Card Effect
    let logMessage = `${player.name} played a ${cardType.replace(/_/g, ' ')} card.`;

    switch (cardType) {
        case 'knight':
            gameState.phase = 'robber_placement';
            logMessage += ' Move the robber.';
            break;

        case 'victory_point':
            player.victoryPoints++;
            logMessage += ' +1 Victory Point!';
            break;

        case 'road_building':
            gameState.phase = 'road_building_1';
            logMessage += ' Place your first road.';
            break;

        case 'year_of_plenty':
            if (!options?.resource1 || !options?.resource2) throw new Error('Must select 2 resources');
            player.resources[options.resource1]++;
            player.resources[options.resource2]++;
            logMessage += ` Received ${options.resource1} and ${options.resource2}.`;
            break;

        case 'monopoly':
            if (!options?.monopolyResource) throw new Error('Must select a resource to monopolize');
            const targetRes = options.monopolyResource;
            let stolenCount = 0;

            gameState.players.forEach(p => {
                if (p.id !== playerId) {
                    const amount = p.resources[targetRes];
                    if (amount > 0) {
                        p.resources[targetRes] = 0;
                        stolenCount += amount;
                    }
                }
            });

            player.resources[targetRes] += stolenCount;
            logMessage += ` Stole ${stolenCount} ${targetRes} from other players.`;
            break;
    }

    // 4. Decrement Card Count
    // Note: VP cards are usually not "played" until the end, but if we treat them as played, we remove them.
    // Standard rules: You don't "play" VP cards, they just count. But for this implementation, let's assume explicit play for simplicity or handle them separately.
    // Actually, let's NOT remove VP cards if they are just revealed? 
    // If we add VP to the count, we should remove the card so it's not counted twice if we iterate.
    // Let's remove it.
    player.devCards[cardType]--;

    // 5. Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: logMessage,
        playerId
    });

    // 6. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function discardCards(roomId: string, playerId: string, resources: Record<ResourceType, number>) {
    return robberService.discardCards(roomId, playerId, resources);
}

import { getPortForVertex } from '@/lib/board-data';

export async function tradeWithBank(roomId: string, playerId: string, giveResource: ResourceType, getResource: ResourceType) {
    return tradingService.tradeWithBank(roomId, playerId, giveResource, getResource);
}

export async function offerTrade(roomId: string, playerId: string, give: Record<ResourceType, number>, get: Record<ResourceType, number>) {
    return tradingService.offerTrade(roomId, playerId, give, get);
}

export async function acceptTrade(roomId: string, playerId: string) {
    return tradingService.acceptTrade(roomId, playerId);
}

export async function cancelTrade(roomId: string, playerId: string) {
    return tradingService.cancelTrade(roomId, playerId);
}

import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity, calculateLongestRoad } from '@/lib/game-logic';

export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    return buildingService.buildRoad(roomId, playerId, edgeId);
}

export async function buildSettlement(roomId: string, playerId: string, vertexId: string) {
    return buildingService.buildSettlement(roomId, playerId, vertexId);
}

export async function buildCity(roomId: string, playerId: string, vertexId: string) {
    return buildingService.buildCity(roomId, playerId, vertexId);
}

export async function debugGiveResource(roomId: string, playerId: string, resource: ResourceType) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    player.resources[resource]++;

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `DEBUG: ${player.name} gave themselves 1 ${resource}.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function placeBonusRoad(roomId: string, playerId: string, edgeId: string) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'road_building_1' && gameState.phase !== 'road_building_2') {
        throw new Error('Not in road building phase');
    }

    // Reuse main phase validation logic (it's the same, just free)
    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (player.roadsRemaining <= 0) {
        throw new Error('No roads remaining');
    }

    // Place Road
    player.roadsRemaining--;
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';

    // Longest Road Logic
    const newLength = calculateLongestRoad(gameState, playerId);
    if (newLength >= 5) {
        if (gameState.longestRoadOwner === null) {
            gameState.longestRoadOwner = playerId;
            gameState.longestRoadLength = newLength;
            player.victoryPoints += 2;
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `${player.name} took the Longest Road (${newLength} segments) and gained 2 VPs!`,
                playerId
            });
        } else if (gameState.longestRoadOwner === playerId) {
            gameState.longestRoadLength = Math.max(gameState.longestRoadLength, newLength);
        } else {
            if (newLength > gameState.longestRoadLength) {
                const oldOwnerId = gameState.longestRoadOwner;
                const oldOwner = gameState.players.find(p => p.id === oldOwnerId);
                if (oldOwner) oldOwner.victoryPoints -= 2;

                gameState.longestRoadOwner = playerId;
                gameState.longestRoadLength = newLength;
                player.victoryPoints += 2;
                gameState.logs.push({
                    id: randomUUID(),
                    timestamp: Date.now(),
                    message: `${player.name} stole the Longest Road (${newLength} segments) from ${oldOwner?.name} and gained 2 VPs!`,
                    playerId
                });
            }
        }
    }

    // Update Phase
    if (gameState.phase === 'road_building_1') {
        // Check if player has more roads
        if (player.roadsRemaining > 0) {
            gameState.phase = 'road_building_2';
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `${player.name} placed first bonus road.`,
                playerId
            });
        } else {
            gameState.phase = 'main_phase';
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `${player.name} finished road building (no roads left).`,
                playerId
            });
        }
    } else {
        gameState.phase = 'main_phase';
        gameState.logs.push({
            id: randomUUID(),
            timestamp: Date.now(),
            message: `${player.name} finished road building.`,
            playerId
        });
    }

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}
