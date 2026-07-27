import { describe, expect, it } from 'vitest';
import { createTestGameState } from '@/lib/test-utils';
import { getRobberPromptKey } from '@/lib/hooks/useGameRobberState';

describe('getRobberPromptKey', () => {
    it('only identifies robber placement for the active player', () => {
        const gameState = createTestGameState({
            currentTurn: 'player-1',
            phase: 'robber_placement',
            logs: [{
                id: 'robber-log',
                timestamp: 1,
                message: 'Move the robber',
            }],
        });

        expect(getRobberPromptKey(gameState, 'player-1')).toBe(
            'player-1:1:robber-log'
        );
        expect(getRobberPromptKey(gameState, 'player-2')).toBeNull();
        expect(getRobberPromptKey(
            { ...gameState, phase: 'main_phase' },
            'player-1'
        )).toBeNull();
    });

    it('changes identity when a later robber placement is logged', () => {
        const gameState = createTestGameState({
            currentTurn: 'player-1',
            phase: 'robber_placement',
            logs: [{
                id: 'first-robber-log',
                timestamp: 1,
                message: 'Move the robber',
            }],
        });
        const firstKey = getRobberPromptKey(gameState, 'player-1');

        expect(getRobberPromptKey({
            ...gameState,
            logs: [
                ...gameState.logs,
                {
                    id: 'second-robber-log',
                    timestamp: 2,
                    message: 'Move the robber again',
                },
            ],
        }, 'player-1')).not.toBe(firstKey);
    });
});
