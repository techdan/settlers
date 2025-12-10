import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { updateLongestRoad } from '@/core/engine/scoring/longest-road';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { TreasonEffect, WeddingSelection } from '@/lib/types/game';
import { updateActiveKnightCount } from '@/core/engine/knights/knight-manager';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { respondToWedding } from '@/core/engine/progress/utilities/WeddingHelpers';
import { Knight } from '@/lib/types/player';

type RoadBuildingEffect = {
    type: 'road_building_progress';
    playerId: string;
    placedEdges?: string[];
};

const KNIGHT_PIECES_PER_LEVEL = 2;

function hasKnightPieceAvailable(player: { knights?: Knight[] }, level: Knight['level']): boolean {
    const count = (player.knights || []).filter(k => k.level === level).length;
    return count < KNIGHT_PIECES_PER_LEVEL;
}

function findRoadBuildingEffect(gameState: GameState, playerId: string): RoadBuildingEffect | undefined {
    return gameState.activeEffects?.find(
        (effect: any): effect is RoadBuildingEffect =>
            effect?.type === 'road_building_progress' && effect.playerId === playerId
    );
}

function removeRoadBuildingEffect(gameState: GameState, playerId: string): void {
    if (!gameState.activeEffects) return;
    gameState.activeEffects = gameState.activeEffects.filter(
        (effect: any) => !(effect?.type === 'road_building_progress' && effect.playerId === playerId)
    );
}

export async function cancelRoadBuildingProgress(roomId: string, playerId: string): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
        throw new Error('Player not found');
    }

    const effect = findRoadBuildingEffect(gameState, playerId);
    if (!effect) {
        throw new Error('No active Road Building progress card to cancel');
    }

    const placedEdges = effect.placedEdges || [];
    let removedCount = 0;

    placedEdges.forEach(edgeId => {
        const edge = gameState.board.edges[edgeId];
        if (edge && edge.owner === playerId && edge.structure === 'road') {
            edge.owner = null;
            edge.structure = null;
            removedCount += 1;
            player.roadsRemaining = (player.roadsRemaining || 0) + 1;
        }
    });

    gameState.phase = 'main_phase';
    removeRoadBuildingEffect(gameState, playerId);

    updateLongestRoad(gameState);
    updateAllVictoryPoints(gameState);

    await updateGameState(gameState);
    return gameState;
}

export async function finalizeRoadBuildingProgress(roomId: string, playerId: string): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
        throw new Error('Player not found');
    }

    const effect = findRoadBuildingEffect(gameState, playerId);
    if (!effect) {
        throw new Error('No active Road Building progress card to finish');
    }

    const placedRoadCount = effect.placedEdges?.length || 0;

    gameState.phase = 'main_phase';

    if (player.progressCards) {
        player.progressCards = player.progressCards.filter(c => c !== 'road_building_progress');
    }

    removeRoadBuildingEffect(gameState, playerId);

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} played Road Building and placed ${placedRoadCount} road${placedRoadCount === 1 ? '' : 's'}`,
        playerId
    });

    await updateGameState(gameState);
    return gameState;
}

function findTreasonEffect(gameState: GameState): TreasonEffect | undefined {
    return gameState.activeEffects?.find(
        (effect: any): effect is TreasonEffect => effect?.type === 'treason'
    );
}

function removeTreasonEffect(gameState: GameState): void {
    if (!gameState.activeEffects) return;
    gameState.activeEffects = gameState.activeEffects.filter((effect: any) => effect?.type !== 'treason');
}

export async function selectTreasonKnight(roomId: string, playerId: string, knightId: string): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Treason is only available in Cities & Knights mode');
    }

    const effect = findTreasonEffect(gameState);
    if (!effect || effect.stage !== 'awaiting_knight') {
        throw new Error('No Treason effect awaiting knight selection');
    }

    if (effect.targetPlayerId !== playerId) {
        throw new Error('You are not the targeted player for Treason');
    }

    const targetPlayer = gameState.players.find(p => p.id === playerId);
    if (!targetPlayer || !targetPlayer.knights) {
        throw new Error('Player has no knights to remove');
    }

    const knightIndex = targetPlayer.knights.findIndex(k => k.id === knightId);
    if (knightIndex === -1) {
        throw new Error('Knight not found');
    }

    const [removedKnight] = targetPlayer.knights.splice(knightIndex, 1);
    updateActiveKnightCount(targetPlayer);

    effect.stage = 'awaiting_placement';
    effect.removedKnight = {
        id: removedKnight.id,
        level: removedKnight.level,
        active: removedKnight.active,
        vertexId: removedKnight.vertexId
    };

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${targetPlayer.name} removed a ${removedKnight.level} knight for Treason`,
        playerId: targetPlayer.id
    });

    await updateGameState(gameState);
    return gameState;
}

export async function placeTreasonKnight(roomId: string, playerId: string, vertexId: string | null): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Treason is only available in Cities & Knights mode');
    }

    const effect = findTreasonEffect(gameState);
    if (!effect || effect.stage !== 'awaiting_placement') {
        throw new Error('No Treason effect awaiting placement');
    }

    if (effect.initiatorId !== playerId) {
        throw new Error('You are not the Treason initiator');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
        throw new Error('Player not found');
    }

    if (!effect.removedKnight) {
        throw new Error('Missing removed knight data for Treason placement');
    }

    // Check supply: if no pieces of that level remain, resolve without placement
    if (!hasKnightPieceAvailable(player, effect.removedKnight.level)) {
        // Remove the card from hand since the effect completed
        if (player.progressCards) {
            player.progressCards = player.progressCards.filter(c => c !== 'treason');
        }

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} could not place a ${effect.removedKnight.level} knight with Treason (no pieces remaining).`,
            playerId
        });
        removeTreasonEffect(gameState);
        await updateGameState(gameState);
        return gameState;
    }

    // Check for any legal placement; if none, resolve without placement
    const validPlacements = Object.keys(gameState.board.vertices).filter(vId =>
        isValidKnightPlacement(gameState, vId, playerId)
    );
    if (validPlacements.length === 0) {
        // Remove the card from hand since the effect completed
        if (player.progressCards) {
            player.progressCards = player.progressCards.filter(c => c !== 'treason');
        }

        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} could not place a ${effect.removedKnight.level} knight with Treason (no legal intersections).`,
            playerId
        });
        removeTreasonEffect(gameState);
        await updateGameState(gameState);
        return gameState;
    }

    if (!vertexId) {
        throw new Error('VertexId is required when legal placements exist');
    }

    if (!isValidKnightPlacement(gameState, vertexId, playerId)) {
        throw new Error('Invalid knight placement');
    }

    if (!player.knights) {
        player.knights = [];
    }

    player.knights.push({
        id: `knight-${Date.now()}-${Math.random()}`,
        playerId,
        vertexId,
        level: effect.removedKnight.level,
        active: effect.removedKnight.active
    });

    updateActiveKnightCount(player);

    // Remove the card from hand since placement was successful
    if (player.progressCards) {
        player.progressCards = player.progressCards.filter(c => c !== 'treason');
    }

    removeTreasonEffect(gameState);

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} placed a ${effect.removedKnight.level} knight with Treason (${effect.removedKnight.active ? 'active' : 'inactive'})`,
        playerId
    });

    await updateGameState(gameState);
    return gameState;
}

export async function cancelTreason(roomId: string, playerId: string): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    const effect = findTreasonEffect(gameState);
    if (!effect) {
        throw new Error('No Treason effect to cancel');
    }

    if (effect.initiatorId !== playerId) {
        throw new Error('Only the Treason initiator can cancel');
    }

    // Restore the removed knight to the target player if we have full data
    if (effect.removedKnight) {
        const targetPlayer = gameState.players.find(p => p.id === effect.targetPlayerId);
        if (!targetPlayer) {
            throw new Error('Target player not found');
        }

        if (!targetPlayer.knights) {
            targetPlayer.knights = [];
        }

        targetPlayer.knights.push({
            id: effect.removedKnight.id,
            playerId: targetPlayer.id,
            vertexId: effect.removedKnight.vertexId,
            level: effect.removedKnight.level,
            active: effect.removedKnight.active
        });
        updateActiveKnightCount(targetPlayer);
    }

    removeTreasonEffect(gameState);

    await updateGameState(gameState);
    return gameState;
}

export async function submitWeddingGifts(
    roomId: string,
    playerId: string,
    selections: WeddingSelection[]
): Promise<GameState> {
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) {
        throw new Error('Game not found');
    }

    if (gameState.gameMode !== 'cities_and_knights') {
        throw new Error('Wedding is only available in Cities & Knights mode');
    }

    respondToWedding(gameState, playerId, selections);

    await updateGameState(gameState);
    return gameState;
}
