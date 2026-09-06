import { expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { discardProgressCardsAction } from '../progress-card-service';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(), updateGameState: vi.fn(),
}));

it('discards one requested duplicate and leaves the other copy in the four-card hand', async () => {
    const player = createTestPlayer({ progressCards: ['merchant', 'merchant', 'alchemist', 'crane', 'inventor'] });
    const state = createTestGameState({ players: [player] });
    vi.mocked(getGameStateByRoomId).mockResolvedValue(state);
    const result = await discardProgressCardsAction(state.roomId, player.id, ['merchant']);
    expect(result.players[0].progressCards).toEqual(['merchant', 'alchemist', 'crane', 'inventor']);
    expect(updateGameState).toHaveBeenCalledWith(result);
});
