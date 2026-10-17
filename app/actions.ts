'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType, ImprovementType } from '@/core/rules/commodity-constants';
import type { DevCardPlayOptions, DevCardType } from '@/lib/types';
import type { WeddingSelection } from '@/lib/types/game';
import type { PlayerColor, ProgressCardType } from '@/lib/types/player';
import type { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { callRoom, createDurableRoom } from '@/lib/services/room-client';


export async function createRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const { roomId, playerId } = await createDurableRoom(playerName);
    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function getRoomPlayers(roomId: string) {
    return callRoom(roomId, 'lobby', 'getRoomPlayerSummaries', roomId);
}

export async function resumeGame(formData: FormData) {
    const roomId = formData.get('roomId') as string;
    const playerId = formData.get('playerId') as string | null;
    const playerName = formData.get('playerName') as string | null;
    const destination = await callRoom(roomId, 'lobby', 'resolveResumePlayer', roomId, playerId, playerName);
    redirect(`/room/${destination.roomId}?playerId=${destination.playerId}`);
}

export async function joinRoom(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const { roomId, playerId } = await callRoom(formData.get('roomId') as string, 'lobby', 'joinRoom', formData.get('roomId') as string, playerName);
    redirect(`/room/${roomId}?playerId=${playerId}`);
}

export async function startGame(roomId: string, gameMode?: 'base' | 'cities_and_knights') {
    return callRoom(roomId, 'game', 'startGame', roomId, gameMode);
}

export async function placeSettlement(roomId: string, playerId: string, vertexId: string) {
    return callRoom(roomId, 'building', 'placeInitialSettlement', roomId, playerId, vertexId);
}

export async function placeRoad(roomId: string, playerId: string, edgeId: string) {
    return callRoom(roomId, 'building', 'placeInitialRoad', roomId, playerId, edgeId);
}

export async function rollDice(roomId: string, playerId: string) {
    return callRoom(roomId, 'game', 'rollDice', roomId, playerId);
}

export async function endTurn(roomId: string, playerId: string) {
    return callRoom(roomId, 'game', 'endTurn', roomId, playerId);
}

export async function moveRobber(roomId: string, playerId: string, hexId: string, victimId?: string) {
    return callRoom(roomId, 'robber', 'moveRobber', roomId, playerId, hexId, victimId);
}

export async function buyDevCard(roomId: string, playerId: string) {
    return callRoom(roomId, 'devCard', 'buyDevCard', roomId, playerId);
}

export async function playDevCard(
    roomId: string,
    playerId: string,
    cardType: DevCardType,
    options?: DevCardPlayOptions
) {
    return callRoom(roomId, 'devCard', 'playDevCard', roomId, playerId, cardType, options);
}

export async function claimDefenderProgressCard(roomId: string, playerId: string, category: ProgressCardCategory) {
    return callRoom(roomId, 'ckGame', 'drawProgressCardAction', roomId, playerId, category);
}

export async function discardCards(roomId: string, playerId: string, resources: Record<ResourceType, number>, commodities?: Record<CommodityType, number>) {
    return callRoom(roomId, 'robber', 'discardCards', roomId, playerId, resources, commodities);
}

export async function tradeWithBank(roomId: string, playerId: string, giveResource: ResourceType | CommodityType, getResource: ResourceType | CommodityType) {
    return callRoom(roomId, 'trading', 'tradeWithBank', roomId, playerId, giveResource, getResource);
}

export async function claimAqueductResource(roomId: string, playerId: string, resource: ResourceType) {
    return callRoom(roomId, 'game', 'claimAqueductResource', roomId, playerId, resource);
}

export async function offerTrade(
    roomId: string,
    playerId: string,
    give: Record<ResourceType, number>,
    get: Record<ResourceType, number>,
    giveCommodities?: Record<CommodityType, number>,
    getCommodities?: Record<CommodityType, number>
) {
    return callRoom(roomId, 'trading', 'offerTrade', roomId, playerId, give, get, giveCommodities, getCommodities);
}

export async function acceptTrade(roomId: string, playerId: string) {
    return callRoom(roomId, 'trading', 'acceptTrade', roomId, playerId);
}

export async function rejectTrade(roomId: string, playerId: string) {
    return callRoom(roomId, 'trading', 'rejectTrade', roomId, playerId);
}

export async function cancelTrade(roomId: string, playerId: string) {
    return callRoom(roomId, 'trading', 'cancelTrade', roomId, playerId);
}

export async function buildRoad(roomId: string, playerId: string, edgeId: string) {
    return callRoom(roomId, 'building', 'buildRoad', roomId, playerId, edgeId);
}

export async function buildSettlement(roomId: string, playerId: string, vertexId: string) {
    return callRoom(roomId, 'building', 'buildSettlement', roomId, playerId, vertexId);
}

export async function buildCity(roomId: string, playerId: string, vertexId: string) {
    return callRoom(roomId, 'building', 'buildCity', roomId, playerId, vertexId);
}

export async function buildKnight(roomId: string, playerId: string, vertexId: string) {
    return callRoom(roomId, 'knight', 'buildKnightAction', roomId, playerId, vertexId);
}

export async function activateKnight(roomId: string, playerId: string, knightId: string) {
    return callRoom(roomId, 'knight', 'activateKnightAction', roomId, playerId, knightId);
}

export async function moveKnight(roomId: string, playerId: string, knightId: string, targetVertexId: string) {
    return callRoom(roomId, 'knight', 'moveKnightAction', roomId, playerId, knightId, targetVertexId);
}

export async function upgradeKnight(roomId: string, playerId: string, knightId: string) {
    return callRoom(roomId, 'knight', 'upgradeKnightAction', roomId, playerId, knightId);
}

export async function relocateKnight(roomId: string, playerId: string, knightId: string, targetVertexId: string | null) {
    return callRoom(roomId, 'knight', 'relocateKnightAction', roomId, playerId, knightId, targetVertexId);
}

export async function chaseAwayRobber(roomId: string, playerId: string, knightId: string) {
    return callRoom(roomId, 'knight', 'chaseAwayRobberAction', roomId, playerId, knightId);
}

export async function buildCityWall(roomId: string, playerId: string, vertexId: string) {
    return callRoom(roomId, 'cityWalls', 'buildCityWall', roomId, playerId, vertexId);
}

export async function upgradeImprovement(
    roomId: string,
    playerId: string,
    improvement: ImprovementType
) {
    const result = await callRoom(roomId, 'improvement', 'upgradePlayerImprovement', roomId, playerId, improvement);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function placeMetropolis(
    roomId: string,
    playerId: string,
    vertexId: string,
    metropolisType: 'science' | 'trade' | 'politics'
) {
    const result = await callRoom(roomId, 'improvement', 'selectMetropolisCity', roomId, playerId, vertexId, metropolisType);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function resolveBarbarianAttack(roomId: string) {
    const result = await callRoom(roomId, 'ckGame', 'resolveBarbarianAttackAction', roomId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function loseCityToBarbarian(roomId: string, playerId: string, vertexId: string) {
    const result = await callRoom(roomId, 'ckGame', 'loseCityToBarbarianAction', roomId, playerId, vertexId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function debugGiveResource(roomId: string, playerId: string, resource: ResourceType) {
    return callRoom(roomId, 'debug', 'giveResource', roomId, playerId, resource);
}

export async function debugGiveCommodity(roomId: string, playerId: string, commodity: CommodityType) {
    return callRoom(roomId, 'debug', 'giveCommodity', roomId, playerId, commodity);
}

export async function debugGiveProgressCard(roomId: string, playerId: string, cardType: ProgressCardType) {
    return callRoom(roomId, 'debug', 'giveProgressCard', roomId, playerId, cardType);
}

export async function debugGiveDevCard(roomId: string, playerId: string, cardType: DevCardType) {
    return callRoom(roomId, 'debug', 'giveDevCard', roomId, playerId, cardType);
}

export async function playProgressCard(
    roomId: string,
    playerId: string,
    cardType: ProgressCardType,
    options?: Record<string, unknown>
) {
    const result = await callRoom(roomId, 'progressCard', 'playProgressCardAction', roomId, playerId, cardType, options);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function discardProgressCards(
    roomId: string,
    playerId: string,
    cardsToDiscard: ProgressCardType[]
) {
    const result = await callRoom(roomId, 'progressCard', 'discardProgressCardsAction', roomId, playerId, cardsToDiscard);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelRoadBuildingProgress(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'progressCard', 'cancelRoadBuildingProgress', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function finalizeRoadBuildingProgress(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'progressCard', 'finalizeRoadBuildingProgress', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function selectTreasonKnight(roomId: string, playerId: string, knightId: string) {
    const result = await callRoom(roomId, 'progressCard', 'selectTreasonKnight', roomId, playerId, knightId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function placeTreasonKnight(roomId: string, playerId: string, vertexId: string | null) {
    const result = await callRoom(roomId, 'progressCard', 'placeTreasonKnight', roomId, playerId, vertexId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelTreason(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'progressCard', 'cancelTreason', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function submitWeddingGiftsAction(
    roomId: string,
    playerId: string,
    selections: WeddingSelection[]
) {
    const result = await callRoom(roomId, 'progressCard', 'submitWeddingGifts', roomId, playerId, selections);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function makeCommercialHarborOffers(
    roomId: string,
    playerId: string,
    offers: Array<{ targetPlayerId: string; offeredResource: ResourceType | null }>
) {
    const result = await callRoom(roomId, 'progressCard', 'makeCommercialHarborOffersAction', roomId, playerId, offers);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function respondToCommercialHarbor(
    roomId: string,
    playerId: string,
    commodity: CommodityType | null
) {
    const result = await callRoom(roomId, 'progressCard', 'respondToCommercialHarborAction', roomId, playerId, commodity);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function cancelCommercialHarbor(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'progressCard', 'cancelCommercialHarborAction', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function placeBonusRoad(roomId: string, playerId: string, edgeId: string) {
    return callRoom(roomId, 'devCard', 'placeBonusRoad', roomId, playerId, edgeId);
}

export async function generateLobbyBoard(roomId: string, hostId: string, fairMode: boolean) {
    const result = await callRoom(roomId, 'lobby', 'generateBoard', roomId, hostId, fairMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function requestNewLobbyBoard(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'lobby', 'requestNewBoard', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function toggleLobbyFairMode(roomId: string, hostId: string, fairMode: boolean) {
    const result = await callRoom(roomId, 'lobby', 'toggleFairMode', roomId, hostId, fairMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function toggleLobbySkipFirstBarbarianAttack(roomId: string, hostId: string, skipFirstBarbarianAttack: boolean) {
    const result = await callRoom(roomId, 'lobby', 'toggleSkipFirstBarbarianAttack', roomId, hostId, skipFirstBarbarianAttack);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyStandardBoard(roomId: string, hostId: string) {
    const result = await callRoom(roomId, 'lobby', 'setStandardBoard', roomId, hostId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyGameMode(roomId: string, hostId: string, gameMode: 'base' | 'cities_and_knights') {
    const result = await callRoom(roomId, 'lobby', 'setGameMode', roomId, hostId, gameMode);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyPlayerOrder(roomId: string, hostId: string, playerOrder: string[]) {
    const result = await callRoom(roomId, 'lobby', 'setPlayerOrder', roomId, hostId, playerOrder);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyPlayerColor(roomId: string, playerId: string, color: PlayerColor) {
    const result = await callRoom(roomId, 'lobby', 'setPlayerColor', roomId, playerId, color);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function setLobbyTimerConfig(roomId: string, hostId: string, timerConfig: import('@/lib/types/timer').TimerConfig) {
    const result = await callRoom(roomId, 'lobby', 'setTimerConfig', roomId, hostId, timerConfig);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function kickPlayerFromLobby(roomId: string, hostId: string, playerIdToKick: string) {
    const result = await callRoom(roomId, 'lobby', 'kickPlayer', roomId, hostId, playerIdToKick);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function requestTimeExtension(roomId: string, playerId: string) {
    const result = await callRoom(roomId, 'timerRequest', 'requestTimeExtensionForGame', roomId, playerId);
    revalidatePath(`/room/${roomId}`);
    return result;
}

export async function sendChatMessage(
    roomId: string,
    playerId: string,
    message: string,
    clientMessageId?: string
) {
    const result = await callRoom(roomId, 'chat', 'sendChatMessage', roomId, playerId, message, clientMessageId);

    if (result.success) {
        revalidatePath(`/room/${roomId}`);
    }

    return result;
}
