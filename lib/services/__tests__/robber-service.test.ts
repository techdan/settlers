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
});
