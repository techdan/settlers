'use server';

import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { randomUUID, randomInt } from 'crypto';

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

    // Create room
    await db.insert(rooms).values({
        id: roomId,
        status: 'waiting',
    });

    // Create host player
    await db.insert(players).values({
        id: playerId,
        roomId: roomId,
        name: playerName,
        isHost: true,
        // clerkUserId: 'stub_clerk_id', // Optional stub
    });

    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function joinRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const roomId = (formData.get('roomId') as string).toUpperCase();

    if (!playerName) throw new Error('Player name is required');
    if (!roomId) throw new Error('Room ID is required');

    // Check if room exists
    const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
    });

    if (!room) {
        // In a real app, we'd return an error to the form.
        // For now, just throw or redirect to error.
        throw new Error('Room not found');
    }

    const playerId = randomUUID();

    await db.insert(players).values({
        id: playerId,
        roomId: roomId,
        name: playerName,
        isHost: false,
    });

    redirect(`/room/${roomId}?playerId=${playerId}`);
}

import { games } from '@/lib/db/schema';
import { generateStandardBoard, ResourceType } from '@/lib/board-data';
import { GameState, PlayerState, Vertex, Edge } from '@/lib/game-types';
import { getCanonicalVertexId, getCanonicalEdgeId, getHexesForVertex, getAdjacentEdgesForVertex } from '@/lib/hex';

export async function startGame(roomId: string) {
    // 1. Get players
    const roomPlayers = await db.query.players.findMany({
        where: eq(players.roomId, roomId),
    });

    if (roomPlayers.length < 1) throw new Error('Not enough players');

    // 2. Shuffle players
    const shuffledPlayers = [...roomPlayers].sort(() => Math.random() - 0.5);
    const turnOrder = shuffledPlayers.map(p => p.id);

    // 3. Initialize Player States
    const playerStates: PlayerState[] = shuffledPlayers.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: ['red', 'blue', 'white', 'orange'][i % 4] as any,
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, desert: 0 },
        devCards: {},
        settlementsRemaining: 5,
        citiesRemaining: 4,
        roadsRemaining: 15,
        victoryPoints: 0,
    }));

    // 4. Generate Board
    const hexes = generateStandardBoard();
    const vertices: Record<string, Vertex> = {};
    const edges: Record<string, Edge> = {};

    hexes.forEach(hex => {
        // Vertices (0-5)
        for (let d = 0; d < 6; d++) {
            const vId = getCanonicalVertexId(hex.hex.q, hex.hex.r, d);
            if (!vertices[vId]) {
                const [q, r, dir] = vId.split(',').map(Number);
                vertices[vId] = {
                    id: vId,
                    q, r, d: dir,
                    owner: null,
                    structure: null
                };
            }
        }
        // Edges (0-5)
        for (let d = 0; d < 6; d++) {
            const eId = getCanonicalEdgeId(hex.hex.q, hex.hex.r, d);
            if (!edges[eId]) {
                const [q, r, dir] = eId.split(',').map(Number);
                edges[eId] = {
                    id: eId,
                    q, r, d: dir,
                    owner: null,
                    structure: null
                };
            }
        }
    });

    // 5. Create Game State
    const gameState: GameState = {
        id: randomUUID(),
        roomId,
        players: playerStates,
        board: {
            hexes,
            vertices,
            edges
        },
        currentTurn: turnOrder[0],
        turnOrder,
        phase: 'setup_round_1_settlement',
        winner: null,
        lastPlacedSettlementId: null,
        robberHexId: hexes.find(h => h.resource === 'desert')?.id || null,
        logs: [{
            id: randomUUID(),
            timestamp: Date.now(),
            message: 'Game started!',
        }],
    };

    // 6. Save to DB
    await db.insert(games).values({
        id: gameState.id,
        roomId,
        state: JSON.stringify(gameState),
    });

    await db.update(rooms)
        .set({ status: 'playing' })
        .where(eq(rooms.id, roomId));
}

import { isValidSetupSettlement, isValidSetupRoad } from '@/lib/game-logic';

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
