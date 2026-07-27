import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    giveCommodity,
    giveDevCard,
    giveProgressCard,
    giveResource,
} from '@/lib/services/debug-service';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types/game';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

describe('debug service', () => {
    let gameState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', name: 'Pa' })],
        });
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);
    });

    it('grants and logs a resource through the game repository', async () => {
        await giveResource('ROOM', 'p1', 'wood');

        expect(gameState.players[0].resources.wood).toBe(1);
        expect(gameState.logs.at(-1)?.message).toBe('DEBUG: Pa gave themselves 1 wood.');
        expect(updateGameState).toHaveBeenCalledWith(gameState);
    });

    it('rejects commodity grants outside Cities and Knights state', async () => {
        gameState.players[0].commodities = undefined;

        await expect(giveCommodity('ROOM', 'p1', 'paper')).rejects.toThrow(
            'Player does not have commodities (not in C&K mode)'
        );
        expect(updateGameState).not.toHaveBeenCalled();
    });

    it('adds a non-victory progress card to the hand', async () => {
        await giveProgressCard('ROOM', 'p1', 'smith');

        expect(gameState.players[0].progressCards).toContain('smith');
        expect(gameState.logs.at(-1)?.message).toBe(
            'DEBUG: Pa gave themselves a smith progress card.'
        );
        expect(updateGameState).toHaveBeenCalledWith(gameState);
    });

    it('reveals victory-point progress cards and records the gain event', async () => {
        await giveProgressCard('ROOM', 'p1', 'printer');

        expect(gameState.players[0].revealedVPCards).toContain('printer');
        expect(gameState.lastVPCardGain).toMatchObject({
            playerId: 'p1',
            cardType: 'printer',
        });
        expect(gameState.logs.at(-1)?.message).toBe('DEBUG: Pa revealed printer for +1 VP.');
        expect(updateGameState).toHaveBeenCalledWith(gameState);
    });

    it('grants a development card and recomputes victory state before saving', async () => {
        await giveDevCard('ROOM', 'p1', 'victory_point');

        expect(gameState.players[0].devCards.victory_point).toBe(1);
        expect(gameState.logs.at(-1)?.message).toBe(
            'DEBUG: Pa gave themselves 1 victory point development card.'
        );
        expect(updateGameState).toHaveBeenCalledWith(gameState);
    });
});
