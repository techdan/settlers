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
import { games } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { isValidSetupSettlement, isValidSetupRoad } from '@/lib/game-logic';

export async function startGame(roomId: string) {
    return gameService.startGame(roomId);
}

export async function placeSettlement(roomId: string, playerId: string, vertexId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'setup_round_1_settlement' && gameState.phase !== 'setup_round_2_settlement') {
        throw new Error('Invalid phase for settlement placement');
    }

    // 2. Validate Placement
    if (!isValidSetupSettlement(gameState, vertexId, playerId)) {
        throw new Error('Invalid settlement placement');
    }

    // 3. Update State
    // Update Vertex
    gameState.board.vertices[vertexId].owner = playerId;
    gameState.board.vertices[vertexId].structure = 'settlement';

    // Update Player
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('Player not found');

    gameState.players[playerIndex].settlementsRemaining--;
    gameState.players[playerIndex].victoryPoints++;

    // Update Phase
    gameState.lastPlacedSettlementId = vertexId;
    if (gameState.phase === 'setup_round_1_settlement') {
        gameState.phase = 'setup_round_1_road';
    } else {
        gameState.phase = 'setup_round_2_road';
    }

    // Add Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${gameState.players[playerIndex].name} placed a settlement.`,
        playerId: playerId
    });

    // 4. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function placeRoad(roomId: string, playerId: string, edgeId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'setup_round_1_road' && gameState.phase !== 'setup_round_2_road') {
        throw new Error('Invalid phase for road placement');
    }

    // 2. Validate Placement
    if (!isValidSetupRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // 3. Update State
    // Update Edge
    gameState.board.edges[edgeId].owner = playerId;
    gameState.board.edges[edgeId].structure = 'road';

    // Update Player
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    gameState.players[playerIndex].roadsRemaining--;

    // Add Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${gameState.players[playerIndex].name} placed a road.`,
        playerId: playerId
    });

    // 4. Handle Turn Rotation (Snake Order)
    const currentTurnIndex = gameState.turnOrder.indexOf(playerId);
    const numPlayers = gameState.players.length;

    if (gameState.phase === 'setup_round_1_road') {
        if (currentTurnIndex < numPlayers - 1) {
            // Next player
            gameState.currentTurn = gameState.turnOrder[currentTurnIndex + 1];
            gameState.phase = 'setup_round_1_settlement';
        } else {
            // Last player goes again (start of round 2)
            // Keep currentTurn same
            gameState.phase = 'setup_round_2_settlement';
        }
    } else {
        // setup_round_2_road

        // Distribute Resources
        if (gameState.lastPlacedSettlementId) {
            const [q, r, d] = gameState.lastPlacedSettlementId.split(',').map(Number);
            const adjacentHexes = getHexesForVertex(q, r, d);

            const playerIndex = gameState.players.findIndex(p => p.id === playerId);
            const player = gameState.players[playerIndex];

            for (const hex of adjacentHexes) {
                // Find matching hex in board state. Note: board hexes are stored as { hex: {q,r,s}, ... }
                const boardHex = gameState.board.hexes.find((h: any) => h.hex.q === hex.q && h.hex.r === hex.r);
                if (boardHex && boardHex.resource && boardHex.resource !== 'desert') {
                    const resource = boardHex.resource as keyof typeof player.resources;
                    player.resources[resource]++;

                    // Log resource gain
                    gameState.logs.push({
                        id: randomUUID(),
                        timestamp: Date.now(),
                        message: `${player.name} received ${resource}.`,
                        playerId: playerId
                    });
                }
            }
        }

        if (currentTurnIndex > 0) {
            // Previous player
            gameState.currentTurn = gameState.turnOrder[currentTurnIndex - 1];
            gameState.phase = 'setup_round_2_settlement';
        } else {
            // First player starts main game
            gameState.currentTurn = gameState.turnOrder[0];
            gameState.phase = 'waiting_for_roll';
        }
    }

    gameState.lastPlacedSettlementId = null; // Reset

    // 5. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function rollDice(roomId: string, playerId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'waiting_for_roll') {
        throw new Error('Cannot roll dice in current phase');
    }

    // 2. Roll Dice
    const d1 = randomInt(1, 7);
    const d2 = randomInt(1, 7);
    const total = d1 + d2;

    gameState.diceRoll = { d1, d2, total };

    // Log Roll
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${gameState.players.find(p => p.id === playerId)?.name} rolled a ${total} (${d1} + ${d2}).`,
        playerId
    });

    // 3. Handle Roll Result
    if (total === 7) {
        // Robber Logic
        let anyoneDiscarding = false;
        gameState.players.forEach(p => {
            const resourceCount = Object.values(p.resources).reduce((a, b) => a + b, 0);
            if (resourceCount > 7) {
                anyoneDiscarding = true;
            }
        });

        if (anyoneDiscarding) {
            gameState.phase = 'discarding';
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `7 rolled! Players with >7 cards must discard half.`,
            });
        } else {
            gameState.phase = 'robber_placement';
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `7 rolled! Move the robber.`,
            });
        }
    } else {
        // Distribute Resources
        const hexes = gameState.board.hexes.filter((h: any) => h.numberToken === total && h.id !== gameState.robberHexId);
        const resourcesGained: Record<string, Record<string, number>> = {}; // playerId -> { resource: amount }

        for (const hex of hexes) {
            if (hex.resource === 'desert') continue;

            for (let d = 0; d < 6; d++) {
                const vId = getCanonicalVertexId(hex.hex.q, hex.hex.r, d);
                const vertex = gameState.board.vertices[vId];

                if (vertex && vertex.owner && vertex.structure) {
                    const amount = vertex.structure === 'city' ? 2 : 1;
                    const playerIndex = gameState.players.findIndex(p => p.id === vertex.owner);

                    if (playerIndex !== -1) {
                        const player = gameState.players[playerIndex];
                        const resource = hex.resource as keyof typeof player.resources;

                        player.resources[resource] += amount;

                        // Track for logging
                        if (!resourcesGained[player.id]) resourcesGained[player.id] = {};
                        if (!resourcesGained[player.id][resource]) resourcesGained[player.id][resource] = 0;
                        resourcesGained[player.id][resource] += amount;
                    }
                }
            }
        }

        // Log gains
        Object.entries(resourcesGained).forEach(([pId, resources]) => {
            const playerName = gameState.players.find(p => p.id === pId)?.name;
            const gainString = Object.entries(resources).map(([res, amt]) => `${amt} ${res}`).join(', ');
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `${playerName} received: ${gainString}`,
                playerId: pId
            });
        });

        if (Object.keys(resourcesGained).length === 0 && hexes.length > 0) {
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `No resources distributed (blocked or no settlements).`,
            });
        }

        gameState.phase = 'main_phase';
    }

    // 4. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function endTurn(roomId: string, playerId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot end turn in current phase');
    }

    // 2. Rotate Turn
    const currentTurnIndex = gameState.turnOrder.indexOf(playerId);
    const nextTurnIndex = (currentTurnIndex + 1) % gameState.players.length;
    const nextPlayerId = gameState.turnOrder[nextTurnIndex];

    gameState.currentTurn = nextPlayerId;
    gameState.phase = 'waiting_for_roll';
    // We keep diceRoll for display until next roll

    // Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `Turn ended. It is now ${gameState.players.find(p => p.id === nextPlayerId)?.name}'s turn.`,
    });

    // 3. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function moveRobber(roomId: string, playerId: string, hexId: string, victimId?: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'robber_placement') {
        throw new Error('Cannot move robber in current phase');
    }

    // 2. Validate Move
    if (hexId === gameState.robberHexId) {
        throw new Error('Robber must be moved to a new hex');
    }

    // 3. Update Robber Location
    gameState.robberHexId = hexId;

    // 4. Steal Resource
    let stealLog = '';

    // Find potential victims if not provided
    let targetVictimId = victimId;
    if (!targetVictimId) {
        const [q, r] = hexId.split(',').map(Number);
        const potentialVictims = new Set<string>();

        for (let d = 0; d < 6; d++) {
            const vId = getCanonicalVertexId(q, r, d);
            const vertex = gameState.board.vertices[vId];
            if (vertex && vertex.owner && vertex.owner !== playerId) {
                // Check if they have resources
                const victim = gameState.players.find(p => p.id === vertex.owner);
                if (victim) {
                    const resCount = Object.values(victim.resources).reduce((a, b) => a + b, 0);
                    if (resCount > 0) {
                        potentialVictims.add(vertex.owner);
                    }
                }
            }
        }

        if (potentialVictims.size > 0) {
            const victimsArray = Array.from(potentialVictims);
            targetVictimId = victimsArray[randomInt(0, victimsArray.length)];
        }
    }

    if (targetVictimId) {
        const victimIndex = gameState.players.findIndex(p => p.id === targetVictimId);
        const thiefIndex = gameState.players.findIndex(p => p.id === playerId);

        if (victimIndex !== -1 && thiefIndex !== -1) {
            const victim = gameState.players[victimIndex];
            const thief = gameState.players[thiefIndex];

            // Get available resources
            const availableResources = (Object.keys(victim.resources) as ResourceType[]).filter(r => victim.resources[r] > 0);

            if (availableResources.length > 0) {
                const randomRes = availableResources[randomInt(0, availableResources.length)];

                victim.resources[randomRes]--;
                thief.resources[randomRes]++;

                stealLog = ` and stole a card from ${victim.name}`;
            } else {
                stealLog = ` but ${victim.name} had no cards to steal`;
            }
        }
    }

    // 5. Update Phase
    gameState.phase = 'main_phase';

    // Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${gameState.players.find(p => p.id === playerId)?.name} moved the robber${stealLog}.`,
        playerId
    });

    // 6. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
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
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.phase !== 'discarding') {
        throw new Error('Not in discarding phase');
    }

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('Player not found');
    const player = gameState.players[playerIndex];

    const currentTotal = Object.values(player.resources).reduce((a, b) => a + b, 0);

    // If player has <= 7 cards, they shouldn't be calling this, but maybe they are confused.
    // However, if they have > 7, they MUST discard.
    if (currentTotal <= 7) {
        throw new Error('No need to discard');
    }

    const discardCount = Object.values(resources).reduce((a, b) => a + b, 0);
    const requiredDiscard = Math.floor(currentTotal / 2);

    if (discardCount !== requiredDiscard) {
        throw new Error(`Must discard exactly ${requiredDiscard} cards`);
    }

    // Deduct resources
    for (const [res, amount] of Object.entries(resources)) {
        if ((player.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to discard`);
        }
        player.resources[res as ResourceType] -= amount;
    }

    player.discardedThisTurn = true;

    // Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} discarded ${discardCount} cards.`,
        playerId
    });

    // Check if everyone is done
    const pendingPlayers = gameState.players.filter(p => {
        const total = Object.values(p.resources).reduce((a, b) => a + b, 0);
        if (total <= 7) return false;
        return !p.discardedThisTurn;
    });

    if (pendingPlayers.length === 0) {
        gameState.phase = 'robber_placement';
        // Reset flags
        gameState.players.forEach(p => p.discardedThisTurn = false);

        gameState.logs.push({
            id: randomUUID(),
            timestamp: Date.now(),
            message: `All discards complete. Move the robber.`,
        });
    }

    // Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

import { getPortForVertex } from '@/lib/board-data';

export async function tradeWithBank(roomId: string, playerId: string, giveResource: ResourceType, getResource: ResourceType) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    // 1. Validate Turn & Phase
    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') {
        throw new Error('Cannot trade in current phase');
    }

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const player = gameState.players[playerIndex];

    // 2. Determine Trade Ratio
    let ratio = 4; // Default 4:1

    // Check all player's settlements/cities for ports
    for (const vertexId in gameState.board.vertices) {
        const vertex = gameState.board.vertices[vertexId];
        if (vertex.owner === playerId && vertex.structure) {
            const portType = getPortForVertex(vertexId);
            if (portType) {
                if (portType === giveResource) {
                    ratio = 2; // Specific port for this resource
                    break; // Best possible ratio found
                } else if (portType === 'generic') {
                    ratio = Math.min(ratio, 3); // Generic port (3:1)
                }
            }
        }
    }

    // 3. Validate Resources
    if (player.resources[giveResource] < ratio) {
        throw new Error(`Not enough ${giveResource}. Need ${ratio} to trade.`);
    }

    // 4. Execute Trade
    player.resources[giveResource] -= ratio;
    player.resources[getResource]++;

    // 5. Log
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} traded ${ratio} ${giveResource} for 1 ${getResource}.`,
        playerId
    });

    // 6. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function offerTrade(roomId: string, playerId: string, give: Record<ResourceType, number>, get: Record<ResourceType, number>) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') throw new Error('Cannot trade now');

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validate resources
    for (const [res, amount] of Object.entries(give)) {
        if ((player.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to offer`);
        }
    }

    gameState.tradeOffer = {
        id: randomUUID(),
        initiator: playerId,
        give,
        get,
        status: 'open'
    };

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} offered a trade.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function acceptTrade(roomId: string, playerId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    if (!gameState.tradeOffer || gameState.tradeOffer.status !== 'open') {
        throw new Error('No active trade offer');
    }

    if (gameState.tradeOffer.initiator === playerId) {
        throw new Error('Cannot accept your own trade');
    }

    const initiator = gameState.players.find(p => p.id === gameState.tradeOffer!.initiator);
    const acceptor = gameState.players.find(p => p.id === playerId);

    if (!initiator || !acceptor) throw new Error('Player not found');

    // Validate acceptor resources
    for (const [res, amount] of Object.entries(gameState.tradeOffer.get)) {
        if ((acceptor.resources[res as ResourceType] || 0) < amount) {
            throw new Error(`Not enough ${res} to accept trade`);
        }
    }

    // Execute Trade
    // Initiator gives 'give', gets 'get'
    // Acceptor gives 'get', gets 'give'
    for (const [res, amount] of Object.entries(gameState.tradeOffer.give)) {
        initiator.resources[res as ResourceType] -= amount;
        acceptor.resources[res as ResourceType] += amount;
    }

    for (const [res, amount] of Object.entries(gameState.tradeOffer.get)) {
        acceptor.resources[res as ResourceType] -= amount;
        initiator.resources[res as ResourceType] += amount;
    }

    gameState.tradeOffer = null;

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${acceptor.name} accepted the trade.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function cancelTrade(roomId: string, playerId: string) {
    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) throw new Error('Game not found');

    const gameState = JSON.parse(game.state) as GameState;

    if (!gameState.tradeOffer) throw new Error('No active trade offer');
    if (gameState.tradeOffer.initiator !== playerId) throw new Error('Only initiator can cancel');

    gameState.tradeOffer = null;

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `Trade offer cancelled.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity, calculateLongestRoad } from '@/lib/game-logic';

export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') throw new Error('Cannot build now');

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Cost: 1 Brick, 1 Wood
    if (player.resources.brick < 1 || player.resources.wood < 1) {
        throw new Error('Not enough resources (1 Brick, 1 Wood)');
    }

    if (!isValidMainPhaseRoad(gameState, edgeId, playerId)) {
        throw new Error('Invalid road placement');
    }

    // Execute
    player.resources.brick--;
    player.resources.wood--;
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
            // Someone else has it
            if (newLength > gameState.longestRoadLength) {
                // Steal it!
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

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} built a road.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function buildSettlement(roomId: string, playerId: string, vertexId: string) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') throw new Error('Cannot build now');

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Cost: 1 Brick, 1 Wood, 1 Sheep, 1 Wheat
    if (player.resources.brick < 1 || player.resources.wood < 1 || player.resources.sheep < 1 || player.resources.wheat < 1) {
        throw new Error('Not enough resources (1 Brick, 1 Wood, 1 Sheep, 1 Wheat)');
    }

    if (!isValidMainPhaseSettlement(gameState, vertexId, playerId)) {
        throw new Error('Invalid settlement placement');
    }

    // Execute
    player.resources.brick--;
    player.resources.wood--;
    player.resources.sheep--;
    player.resources.wheat--;
    player.settlementsRemaining--;
    player.victoryPoints++;

    gameState.board.vertices[vertexId].owner = playerId;
    gameState.board.vertices[vertexId].structure = 'settlement';

    // Longest Road Recalculation (Settlement might break roads)
    const lengths = gameState.players.map(p => ({
        id: p.id,
        len: calculateLongestRoad(gameState, p.id)
    }));
    lengths.sort((a, b) => b.len - a.len);

    const max = lengths[0];
    const runnerUp = lengths[1];

    const currentOwnerId = gameState.longestRoadOwner;

    if (currentOwnerId) {
        const currentOwnerStats = lengths.find(l => l.id === currentOwnerId);
        // If current owner is still best (or tied for best), they keep it
        if (currentOwnerStats && currentOwnerStats.len >= 5 && currentOwnerStats.len >= max.len) {
            gameState.longestRoadLength = currentOwnerStats.len;
        } else {
            // Current owner lost it
            const oldOwner = gameState.players.find(p => p.id === currentOwnerId);
            if (oldOwner) oldOwner.victoryPoints -= 2;

            // Determine new owner
            if (max.len >= 5) {
                if (runnerUp && runnerUp.len === max.len) {
                    // Tie at top -> No one owns it
                    gameState.longestRoadOwner = null;
                    gameState.longestRoadLength = max.len;
                    gameState.logs.push({
                        id: randomUUID(),
                        timestamp: Date.now(),
                        message: `Longest Road is tied at ${max.len}. No one owns it.`,
                    });
                } else {
                    // New Winner
                    gameState.longestRoadOwner = max.id;
                    gameState.longestRoadLength = max.len;
                    const newOwner = gameState.players.find(p => p.id === max.id);
                    if (newOwner) newOwner.victoryPoints += 2;
                    gameState.logs.push({
                        id: randomUUID(),
                        timestamp: Date.now(),
                        message: `${newOwner?.name} took the Longest Road (${max.len}).`,
                    });
                }
            } else {
                // No one qualifies
                gameState.longestRoadOwner = null;
                gameState.longestRoadLength = 0;
                gameState.logs.push({
                    id: randomUUID(),
                    timestamp: Date.now(),
                    message: `Longest Road lost. No one has 5 segments.`,
                });
            }
        }
    } else {
        // No current owner, check if someone claims it (unlikely from settlement build, but possible if tie broken?)
        if (max.len >= 5) {
            if (!runnerUp || runnerUp.len < max.len) {
                gameState.longestRoadOwner = max.id;
                gameState.longestRoadLength = max.len;
                const newOwner = gameState.players.find(p => p.id === max.id);
                if (newOwner) newOwner.victoryPoints += 2;
                gameState.logs.push({
                    id: randomUUID(),
                    timestamp: Date.now(),
                    message: `${newOwner?.name} took the Longest Road (${max.len}).`,
                });
            }
        }
    }

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} built a settlement.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function buildCity(roomId: string, playerId: string, vertexId: string) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    if (gameState.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameState.phase !== 'main_phase') throw new Error('Cannot build now');

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Cost: 3 Ore, 2 Wheat
    if (player.resources.ore < 3 || player.resources.wheat < 2) {
        throw new Error('Not enough resources (3 Ore, 2 Wheat)');
    }

    if (!isValidMainPhaseCity(gameState, vertexId, playerId)) {
        throw new Error('Invalid city placement');
    }

    // Execute
    player.resources.ore -= 3;
    player.resources.wheat -= 2;
    player.citiesRemaining--;
    player.settlementsRemaining++; // Get settlement back
    player.victoryPoints++; // +1 net VP (City is 2, Settlement was 1)

    gameState.board.vertices[vertexId].structure = 'city';

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${player.name} upgraded to a city.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
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
