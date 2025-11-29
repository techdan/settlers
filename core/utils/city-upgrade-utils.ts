import { GameState } from '@/lib/types';

/**
 * Return all of a player's settlements that can be upgraded to cities.
 * Used by Medicine progress card UI to highlight valid targets.
 */
export function getUpgradeableSettlementVertices(
    gameState: GameState,
    playerId: string
): string[] {
    return Object.values(gameState.board.vertices)
        .filter(vertex => vertex.owner === playerId && vertex.structure === 'settlement')
        .map(vertex => vertex.id);
}
