import { randomUUID } from 'crypto';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import { checkVictoryCondition, updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import type { GameState } from '@/lib/types/game';
import type { DevCardType, PlayerState, ProgressCardType } from '@/lib/types/player';

async function getGameAndPlayer(roomId: string, playerId: string): Promise<{
    gameState: GameState;
    player: PlayerState;
}> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    const player = gameState.players.find(candidate => candidate.id === playerId);
    if (!player) throw new Error('Player not found');

    return { gameState, player };
}

function addDebugLog(gameState: GameState, playerId: string, message: string): void {
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message,
        playerId,
    });
}

function applyVictoryState(gameState: GameState): void {
    updateAllVictoryPoints(gameState);

    const winnerId = checkVictoryCondition(gameState);
    if (!winnerId) return;

    gameState.winner = winnerId;
    gameState.phase = 'game_over';

    const winner = gameState.players.find(player => player.id === winnerId);
    gameState.logs.push({
        id: randomUUID(),
        timestamp: Date.now(),
        message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`,
    });
}

export async function giveResource(roomId: string, playerId: string, resource: ResourceType): Promise<void> {
    const { gameState, player } = await getGameAndPlayer(roomId, playerId);

    player.resources[resource]++;
    addDebugLog(gameState, playerId, `DEBUG: ${player.name} gave themselves 1 ${resource}.`);

    await updateGameState(gameState);
}

export async function giveCommodity(roomId: string, playerId: string, commodity: CommodityType): Promise<void> {
    const { gameState, player } = await getGameAndPlayer(roomId, playerId);
    if (!player.commodities) {
        throw new Error('Player does not have commodities (not in C&K mode)');
    }

    player.commodities[commodity]++;
    addDebugLog(gameState, playerId, `DEBUG: ${player.name} gave themselves 1 ${commodity}.`);

    await updateGameState(gameState);
}

export async function giveProgressCard(
    roomId: string,
    playerId: string,
    cardType: ProgressCardType
): Promise<void> {
    const { gameState, player } = await getGameAndPlayer(roomId, playerId);
    if (!player.progressCards) {
        throw new Error('Player does not have progress cards (not in C&K mode)');
    }

    const isVictoryPointCard = cardType === 'printer' || cardType === 'constitution';
    if (isVictoryPointCard) {
        player.revealedVPCards ??= [];
        if (!player.revealedVPCards.includes(cardType)) {
            player.revealedVPCards.push(cardType);
        }

        gameState.lastVPCardGain = {
            playerId,
            cardType,
            timestamp: Date.now(),
        };

        applyVictoryState(gameState);
        addDebugLog(gameState, playerId, `DEBUG: ${player.name} revealed ${cardType} for +1 VP.`);
    } else {
        player.progressCards.push(cardType);
        addDebugLog(gameState, playerId, `DEBUG: ${player.name} gave themselves a ${cardType} progress card.`);
    }

    await updateGameState(gameState);
}

export async function giveDevCard(roomId: string, playerId: string, cardType: DevCardType): Promise<void> {
    const { gameState, player } = await getGameAndPlayer(roomId, playerId);

    player.devCards ??= {
        knight: 0,
        monopoly: 0,
        road_building: 0,
        victory_point: 0,
        year_of_plenty: 0,
    };
    player.devCards[cardType] = (player.devCards[cardType] || 0) + 1;

    applyVictoryState(gameState);
    addDebugLog(
        gameState,
        playerId,
        `DEBUG: ${player.name} gave themselves 1 ${cardType.replace(/_/g, ' ')} development card.`
    );

    await updateGameState(gameState);
}
