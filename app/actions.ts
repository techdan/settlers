'use server';

import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

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
import { generateStandardBoard } from '@/lib/board-data';
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
            gameState.phase = 'main_game';
        }
    }

    gameState.lastPlacedSettlementId = null; // Reset

    // 5. Save
    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}
