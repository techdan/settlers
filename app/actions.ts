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

import { DevCardType, GameState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { getHexesForVertex, getAdjacentEdgesForVertex, getCanonicalVertexId } from '@/lib/hex';
import * as gameService from '@/lib/services/game-service';
import * as buildingService from '@/lib/services/building-service';
import * as tradingService from '@/lib/services/trading-service';
import * as robberService from '@/lib/services/robber-service';
import * as devCardService from '@/lib/services/devcard-service';
import { games } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { isValidSetupSettlement, isValidSetupRoad } from '@/core/validation/setup-validator';

export async function startGame(roomId: string, gameMode?: 'base' | 'cities_and_knights') {
    return gameService.startGame(roomId, gameMode);
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
    return devCardService.buyDevCard(roomId, playerId);
}

export async function playDevCard(roomId: string, playerId: string, cardType: DevCardType, options?: { resource1?: ResourceType, resource2?: ResourceType, monopolyResource?: ResourceType }) {
    return devCardService.playDevCard(roomId, playerId, cardType, options);
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

import { isValidMainPhaseRoad, isValidMainPhaseSettlement, isValidMainPhaseCity } from '@/core/validation/building-validator';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';

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
    return devCardService.placeBonusRoad(roomId, playerId, edgeId);
}

import { LobbyService } from '@/lib/services/lobby-service';
import { revalidatePath } from 'next/cache';

export async function generateLobbyBoard(roomId: string, hostId: string, fairMode: boolean) {
    const result = await LobbyService.generateBoard(roomId, hostId, fairMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function requestNewLobbyBoard(roomId: string, playerId: string) {
    const result = await LobbyService.requestNewBoard(roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function toggleLobbyFairMode(roomId: string, hostId: string, fairMode: boolean) {
    const result = await LobbyService.toggleFairMode(roomId, hostId, fairMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyStandardBoard(roomId: string, hostId: string) {
    const result = await LobbyService.setStandardBoard(roomId, hostId);
    revalidatePath(`/room/${roomId}`);
    return result;
}
