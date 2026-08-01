'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType, ImprovementType } from '@/core/rules/commodity-constants';
import type { DevCardPlayOptions, DevCardType } from '@/lib/types';
import type { WeddingSelection } from '@/lib/types/game';
import type { PlayerColor, ProgressCardType } from '@/lib/types/player';
import * as buildingService from '@/lib/services/building-service';
import * as chatService from '@/lib/services/chat-service';
import * as cityWallsService from '@/lib/services/city-walls-service';
import * as ckGameService from '@/lib/services/ck-game-service';
import * as debugService from '@/lib/services/debug-service';
import * as devCardService from '@/lib/services/devcard-service';
import * as gameService from '@/lib/services/game-service';
import * as improvementService from '@/lib/services/improvement-service';
import * as knightService from '@/lib/services/knight-service';
import { LobbyService } from '@/lib/services/lobby-service';
import * as progressCardService from '@/lib/services/progress-card-service';
import * as robberService from '@/lib/services/robber-service';
import { requestTimeExtensionForGame } from '@/lib/services/timer-request-service';
import * as tradingService from '@/lib/services/trading-service';

export async function createRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const { roomId, playerId } = await LobbyService.createRoom(playerName);
    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function getRoomPlayers(roomId: string) {
    return LobbyService.getRoomPlayerSummaries(roomId);
}

export async function resumeGame(formData: FormData) {
    const roomId = formData.get('roomId') as string;
    const playerId = formData.get('playerId') as string | null;
    const playerName = formData.get('playerName') as string | null;
    const destination = await LobbyService.resolveResumePlayer(roomId, playerId, playerName);
    redirect(`/room/${destination.roomId}?playerId=${destination.playerId}`);
}

export async function joinRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const { roomId, playerId } = await LobbyService.joinRoom(formData.get('roomId') as string, playerName);
    redirect(`/room/${roomId}?playerId=${playerId}`);
}

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

export async function playDevCard(
    roomId: string,
    playerId: string,
    cardType: DevCardType,
    options?: DevCardPlayOptions
) {
    return devCardService.playDevCard(roomId, playerId, cardType, options);
}

export async function discardCards(roomId: string, playerId: string, resources: Record<ResourceType, number>, commodities?: Record<CommodityType, number>) {
    return robberService.discardCards(roomId, playerId, resources, commodities);
}

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

export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    return buildingService.buildRoad(roomId, playerId, edgeId);
}

export async function buildSettlement(roomId: string, playerId: string, vertexId: string) {
    return buildingService.buildSettlement(roomId, playerId, vertexId);
}

export async function buildCity(roomId: string, playerId: string, vertexId: string) {
    return buildingService.buildCity(roomId, playerId, vertexId);
}

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
    return debugService.giveResource(roomId, playerId, resource);
}

export async function debugGiveCommodity(roomId: string, playerId: string, commodity: CommodityType) {
    return debugService.giveCommodity(roomId, playerId, commodity);
}

export async function debugGiveProgressCard(roomId: string, playerId: string, cardType: ProgressCardType) {
    return debugService.giveProgressCard(roomId, playerId, cardType);
}

export async function debugGiveDevCard(roomId: string, playerId: string, cardType: DevCardType) {
    return debugService.giveDevCard(roomId, playerId, cardType);
}

export async function playProgressCard(
    roomId: string,
    playerId: string,
    cardType: ProgressCardType,
    options?: Record<string, unknown>
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

export async function toggleLobbySkipFirstBarbarianAttack(roomId: string, hostId: string, skipFirstBarbarianAttack: boolean) {
    const result = await LobbyService.toggleSkipFirstBarbarianAttack(roomId, hostId, skipFirstBarbarianAttack);
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

export async function setLobbyPlayerOrder(roomId: string, hostId: string, playerOrder: string[]) {
    const result = await LobbyService.setPlayerOrder(roomId, hostId, playerOrder);
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

export async function kickPlayerFromLobby(roomId: string, hostId: string, playerIdToKick: string) {
    const result = await LobbyService.kickPlayer(roomId, hostId, playerIdToKick);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function requestTimeExtension(roomId: string, playerId: string) {
    const result = await requestTimeExtensionForGame(roomId, playerId);
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
