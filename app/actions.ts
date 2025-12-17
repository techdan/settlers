'use server';

import { redirect } from 'next/navigation';
import { randomUUID, randomInt } from 'crypto';
import * as roomRepository from '@/lib/repositories/room-repository';
import * as playerRepository from '@/lib/repositories/player-repository';
import * as chatService from '@/lib/services/chat-service';

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

    // Initialize lobby with the beginner board so hosts land on a ready-to-play setup
    await LobbyService.setStandardBoard(roomId, playerId);

    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function getRoomPlayers(roomId: string) {
    // Check if room exists
    const room = await roomRepository.findRoomById(roomId.toUpperCase());
    if (!room) {
        throw new Error('Room not found');
    }

    const players = await playerRepository.findPlayersByRoomId(roomId.toUpperCase());
    return players.map(p => ({ id: p.id, name: p.name }));
}

export async function resumeGame(formData: FormData) {
    const roomId = (formData.get('roomId') as string).toUpperCase();
    const playerId = formData.get('playerId') as string | null;
    const playerName = formData.get('playerName') as string | null;

    if (!roomId) throw new Error('Room ID is required');

    // Check if room exists
    const room = await roomRepository.findRoomById(roomId);
    if (!room) {
        throw new Error('Room not found');
    }

    let targetPlayerId = playerId;

    if (!targetPlayerId && playerName) {
        // Find existing player by name
        const player = await playerRepository.findPlayerByName(roomId, playerName);
        if (player) {
            targetPlayerId = player.id;
        }
    }

    if (!targetPlayerId) {
        throw new Error('Player not found in this room. Please check the name or join as a new player.');
    }

    redirect(`/room/${roomId}?playerId=${targetPlayerId}`);
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
import { PlayerColor } from '@/lib/types/player';
import { ResourceType } from '@/core/rules/board-constants';
import { getHexesForVertex, getAdjacentEdgesForVertex, getCanonicalVertexId } from '@/lib/hex';
import * as gameService from '@/lib/services/game-service';
import * as buildingService from '@/lib/services/building-service';
import * as tradingService from '@/lib/services/trading-service';
import * as robberService from '@/lib/services/robber-service';
import * as devCardService from '@/lib/services/devcard-service';
import * as progressCardService from '@/lib/services/progress-card-service';
import * as ckGameService from '@/lib/services/ck-game-service';
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

import { getPortForVertex } from '@/core/engine/board/port-generator';

export async function tradeWithBank(roomId: string, playerId: string, giveResource: ResourceType | CommodityType, getResource: ResourceType | CommodityType) {
    return tradingService.tradeWithBank(roomId, playerId, giveResource, getResource);
}

export async function claimAqueductResource(roomId: string, playerId: string, resource: ResourceType) {
    return gameService.claimAqueductResource(roomId, playerId, resource);
}

export async function offerTrade(
    roomId: string,
    playerId: string,
    give: Record<ResourceType, number>,
    get: Record<ResourceType, number>,
    giveCommodities?: Record<CommodityType, number>,
    getCommodities?: Record<CommodityType, number>
) {
    return tradingService.offerTrade(roomId, playerId, give, get, giveCommodities, getCommodities);
}

export async function acceptTrade(roomId: string, playerId: string) {
    return tradingService.acceptTrade(roomId, playerId);
}

export async function rejectTrade(roomId: string, playerId: string) {
    return tradingService.rejectTrade(roomId, playerId);
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

import * as knightService from '@/lib/services/knight-service';
import * as cityWallsService from '@/lib/services/city-walls-service';
import * as improvementService from '@/lib/services/improvement-service';

export async function buildKnight(roomId: string, playerId: string, vertexId: string) {
    return knightService.buildKnightAction(roomId, playerId, vertexId);
}

export async function activateKnight(roomId: string, playerId: string, knightId: string) {
    return knightService.activateKnightAction(roomId, playerId, knightId);
}

export async function moveKnight(roomId: string, playerId: string, knightId: string, targetVertexId: string) {
    return knightService.moveKnightAction(roomId, playerId, knightId, targetVertexId);
}

export async function upgradeKnight(roomId: string, playerId: string, knightId: string) {
    return knightService.upgradeKnightAction(roomId, playerId, knightId);
}

export async function relocateKnight(roomId: string, playerId: string, knightId: string, targetVertexId: string | null) {
    return knightService.relocateKnightAction(roomId, playerId, knightId, targetVertexId);
}

export async function chaseAwayRobber(roomId: string, playerId: string, knightId: string) {
    return knightService.chaseAwayRobberAction(roomId, playerId, knightId);
}

export async function buildCityWall(roomId: string, playerId: string, vertexId: string) {
    return cityWallsService.buildCityWall(roomId, playerId, vertexId);
}

export async function upgradeImprovement(
    roomId: string,
    playerId: string,
    improvement: ImprovementType
) {
    const result = await improvementService.upgradePlayerImprovement(roomId, playerId, improvement);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function placeMetropolis(
    roomId: string,
    playerId: string,
    vertexId: string,
    metropolisType: 'science' | 'trade' | 'politics'
) {
    const result = await improvementService.selectMetropolisCity(roomId, playerId, vertexId, metropolisType);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function resolveBarbarianAttack(roomId: string) {
    const result = await ckGameService.resolveBarbarianAttackAction(roomId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function loseCityToBarbarian(roomId: string, playerId: string, vertexId: string) {
    const result = await ckGameService.loseCityToBarbarianAction(roomId, playerId, vertexId);
    revalidatePath(`/room/${roomId}`);
    return result;
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

import { CommodityType, ImprovementType } from '@/core/rules/commodity-constants';
import { ProgressCardType } from '@/lib/types/player';
import { WeddingSelection } from '@/lib/types/game';
import { updateAllVictoryPoints, checkVictoryCondition } from '@/core/rules/victory-conditions';

export async function debugGiveCommodity(roomId: string, playerId: string, commodity: CommodityType) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (!player.commodities) {
        throw new Error('Player does not have commodities (not in C&K mode)');
    }

    player.commodities[commodity]++;

    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `DEBUG: ${player.name} gave themselves 1 ${commodity}.`,
        playerId
    });

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function debugGiveProgressCard(roomId: string, playerId: string, cardType: ProgressCardType) {
    const game = await db.query.games.findFirst({ where: eq(games.roomId, roomId) });
    if (!game) throw new Error('Game not found');
    const gameState = JSON.parse(game.state) as GameState;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (!player.progressCards) {
        throw new Error('Player does not have progress cards (not in C&K mode)');
    }

    const isVPCard = cardType === 'printer' || cardType === 'constitution';

    if (isVPCard) {
        if (!player.revealedVPCards) {
            player.revealedVPCards = [];
        }
        if (!player.revealedVPCards.includes(cardType)) {
            player.revealedVPCards.push(cardType);
        }

        gameState.lastVPCardGain = {
            playerId,
            cardType,
            timestamp: Date.now()
        };

        updateAllVictoryPoints(gameState);

        const winnerId = checkVictoryCondition(gameState);
        if (winnerId) {
            gameState.winner = winnerId;
            gameState.phase = 'game_over';

            const winner = gameState.players.find(p => p.id === winnerId);
            gameState.logs.push({
                id: randomUUID(),
                timestamp: Date.now(),
                message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`
            });
        }

        gameState.logs.push({
            id: randomUUID(),
            timestamp: Date.now(),
            message: `DEBUG: ${player.name} revealed ${cardType} for +1 VP.`,
            playerId
        });
    } else {
        player.progressCards.push(cardType);

        gameState.logs.push({
            id: randomUUID(),
            timestamp: Date.now(),
            message: `DEBUG: ${player.name} gave themselves a ${cardType} progress card.`,
            playerId
        });
    }

    await db.update(games)
        .set({ state: JSON.stringify(gameState), updatedAt: new Date() })
        .where(eq(games.id, gameState.id));
}

export async function playProgressCard(
    roomId: string,
    playerId: string,
    cardType: ProgressCardType,
    options?: any
) {
    const result = await progressCardService.playProgressCardAction(roomId, playerId, cardType, options);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function discardProgressCards(
    roomId: string,
    playerId: string,
    cardsToDiscard: ProgressCardType[]
) {
    const result = await progressCardService.discardProgressCardsAction(roomId, playerId, cardsToDiscard);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelRoadBuildingProgress(roomId: string, playerId: string) {
    const result = await progressCardService.cancelRoadBuildingProgress(roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function finalizeRoadBuildingProgress(roomId: string, playerId: string) {
    const result = await progressCardService.finalizeRoadBuildingProgress(roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function selectTreasonKnight(roomId: string, playerId: string, knightId: string) {
    const result = await progressCardService.selectTreasonKnight(roomId, playerId, knightId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function placeTreasonKnight(roomId: string, playerId: string, vertexId: string | null) {
    const result = await progressCardService.placeTreasonKnight(roomId, playerId, vertexId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelTreason(roomId: string, playerId: string) {
    const result = await progressCardService.cancelTreason(roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function submitWeddingGiftsAction(
    roomId: string,
    playerId: string,
    selections: WeddingSelection[]
) {
    const result = await progressCardService.submitWeddingGifts(roomId, playerId, selections);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function makeCommercialHarborOffers(
    roomId: string,
    playerId: string,
    offers: Array<{ targetPlayerId: string; offeredResource: ResourceType | null }>
) {
    const result = await progressCardService.makeCommercialHarborOffersAction(roomId, playerId, offers);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function respondToCommercialHarbor(
    roomId: string,
    playerId: string,
    commodity: CommodityType | null
) {
    const result = await progressCardService.respondToCommercialHarborAction(roomId, playerId, commodity);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelCommercialHarbor(roomId: string, playerId: string) {
    const result = await progressCardService.cancelCommercialHarborAction(roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
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

export async function setLobbyGameMode(roomId: string, hostId: string, gameMode: 'base' | 'cities_and_knights') {
    const result = await LobbyService.setGameMode(roomId, hostId, gameMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyPlayerColor(roomId: string, playerId: string, color: PlayerColor) {
    const result = await LobbyService.setPlayerColor(roomId, playerId, color);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyTimerConfig(roomId: string, hostId: string, timerConfig: import('@/lib/types/timer').TimerConfig) {
    const result = await LobbyService.setTimerConfig(roomId, hostId, timerConfig);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function requestTimeExtension(roomId: string, playerId: string) {
    const { requestExtension } = await import('@/lib/services/timer-service');
    const { getGameStateByRoomId, updateGameState } = await import('@/lib/repositories/game-repository');

    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    const result = requestExtension(gameState, playerId);

    if (!result.success) {
        throw new Error(result.error || 'Failed to request extension');
    }

    if (result.newState) {
        await updateGameState(result.newState);
    }

    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function sendChatMessage(
    roomId: string,
    playerId: string,
    message: string,
    clientMessageId?: string
) {
    const result = await chatService.sendChatMessage(roomId, playerId, message, clientMessageId);

    if (result.success) {
        revalidatePath(`/room/${roomId}`);
    }

    return result;
}
