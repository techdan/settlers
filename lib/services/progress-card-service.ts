import { GameState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { updateLongestRoad } from '@/core/engine/scoring/longest-road';
import { updateAllVictoryPoints } from '@/core/rules/victory-conditions';

type RoadBuildingEffect = {
    type: 'road_building_progress';
    playerId: string;
    placedEdges?: string[];
};

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
