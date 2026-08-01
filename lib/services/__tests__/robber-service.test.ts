import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { discardCards } from '../robber-service';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

describe('Robber Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('counts and discards commodities as part of a Cities & Knights robber hand', async () => {
        const player = createTestPlayer({
            id: 'kaius',
            name: 'Kaius',
            resources: { wood: 3, brick: 2, sheep: 0, wheat: 0, ore: 0 },
            commodities: { paper: 2, cloth: 1, coin: 1 },
        });
        const gameState = createTestGameState({
            roomId: 'AVXU',
            players: [player],
            currentTurn: player.id,
            phase: 'discarding',
            discardContext: { type: 'robber' },
            hasBarbariansAttacked: true,
        });
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

        const result = await discardCards(
            'AVXU',
            player.id,
            { wood: 2, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            { paper: 2, cloth: 0, coin: 0 }
        );

        expect(result.players[0].resources.wood).toBe(1);
        expect(result.players[0].commodities).toEqual({ paper: 0, cloth: 1, coin: 1 });
        expect(result.phase).toBe('robber_placement');
        expect(updateGameState).toHaveBeenCalledWith(result);
    });

    it('pauses the active turn while another player still has to discard', async () => {
        const p1 = createTestPlayer({
            id: 'p1',
            resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        });
        const p2 = createTestPlayer({
            id: 'p2',
            resources: { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        });
        const gameState = {
            ...createTestGameState({
            roomId: 'AVXU',
            players: [p1, p2],
            currentTurn: 'p1',
            phase: 'discarding',
            discardContext: { type: 'robber' },
            }),
            timerConfig: {
                enabled: true,
                turnTimeLimit: 120,
                timeBank: 300,
                extensionIncrement: 60,
                maxExtensionsPerTurn: 2,
                maxExtraSecondsPerTurn: 180,
            },
            turnStartTime: Date.now() - 5_000,
        };
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

        const result = await discardCards(
            'AVXU',
            'p1',
            { wood: 4, brick: 0, sheep: 0, wheat: 0, ore: 0 },
        );

        expect(result.phase).toBe('discarding');
        expect(result.turnPausedAt).toBeDefined();
        expect(updateGameState).toHaveBeenCalledWith(result);
    });
});
