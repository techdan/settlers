import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';

vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

vi.mock('@/core/engine/dice/event-die-manager', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/core/engine/dice/event-die-manager')>();
    return {
        ...actual,
        rollEventDie: vi.fn(),
    };
});

import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { rollEventDie } from '@/core/engine/dice/event-die-manager';
import { discardProgressCardsAction, revealAlchemyEventDie } from '../progress-card-service';
import { canRollDice } from '../obligation-tracker';

describe('Alchemy event-die commitment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reveals and persists one event result without resolving its effects', async () => {
        const player = createTestPlayer({ id: 'p1', progressCards: ['alchemist'] });
        const gameState = createTestGameState({
            players: [player],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
            gameMode: 'cities_and_knights',
            barbarianPosition: 2,
        });
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);
        vi.mocked(rollEventDie).mockReturnValue('ship');

        const result = await revealAlchemyEventDie('room-1', 'p1');

        expect(result.pendingAlchemy).toMatchObject({ playerId: 'p1', eventDieFace: 'ship' });
        expect(result.eventDieRoll?.face).toBe('ship');
        expect(result.barbarianPosition).toBe(2);
        expect(result.eventDieStats?.ship).toBe(0);
        expect(updateGameState).toHaveBeenCalledWith(result);
        expect(canRollDice(result).canRollDice).toBe(false);
    });

    it('returns the locked result on retry instead of rerolling', async () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', progressCards: ['alchemist'] })],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
            gameMode: 'cities_and_knights',
        });
        gameState.pendingAlchemy = { playerId: 'p1', eventDieFace: 'science', revealedAt: 123 };
        gameState.eventDieRoll = { face: 'science', timestamp: 123 };
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

        const result = await revealAlchemyEventDie('room-1', 'p1');

        expect(result.pendingAlchemy?.eventDieFace).toBe('science');
        expect(rollEventDie).not.toHaveBeenCalled();
        expect(updateGameState).not.toHaveBeenCalled();
    });

    it('cannot discard the committed Alchemy card after seeing the event result', async () => {
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', progressCards: ['alchemist'] })],
            currentTurn: 'p1',
            phase: 'waiting_for_roll',
            gameMode: 'cities_and_knights',
        });
        gameState.pendingAlchemy = { playerId: 'p1', eventDieFace: 'trade', revealedAt: 123 };
        vi.mocked(getGameStateByRoomId).mockResolvedValue(gameState);

        await expect(discardProgressCardsAction('room-1', 'p1', ['alchemist'])).rejects.toThrow(
            'Cannot discard Alchemy after the event die has been revealed'
        );
        expect(updateGameState).not.toHaveBeenCalled();
    });
});
