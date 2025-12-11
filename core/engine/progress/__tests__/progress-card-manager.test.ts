import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    drawProgressCard,
    playProgressCard
} from '../progress-card-manager';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';

// Mock CardExecutor to avoid executing real effects during this manager test
vi.mock('../CardExecutor', () => {
    return {
        getCardExecutor: () => ({
            execute: vi.fn(), // Mock execute method
        })
    };
});

describe('Progress Card Manager', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Player 1' }),
                createTestPlayer({ id: 'p2', name: 'Player 2' }),
            ],
            gameMode: 'cities_and_knights'
        });

        // Initialize valid decks
        gameState.progressDecks = {
            science: ['mining', 'irrigation'] as ProgressCardType[],
            trade: ['merchant', 'commercial_harbor'] as ProgressCardType[],
            politics: ['spy', 'diplomat'] as ProgressCardType[]
        };
    });

    describe('drawProgressCard', () => {
        it('draws a card from the deck', () => {
            const card = drawProgressCard(gameState, 'p1', 'science');

            expect(card).toBe('mining');
            expect(gameState.progressDecks?.science).toHaveLength(1); // One removed
            expect(gameState.players[0].progressCards).toContain('mining');
        });

        it('returns null if deck is empty', () => {
            gameState.progressDecks!.science = [];
            const card = drawProgressCard(gameState, 'p1', 'science');

            expect(card).toBeNull();
        });

        it('auto-plays VP cards (printer)', () => {
            // Setup deck with VP card
            gameState.progressDecks!.science = ['printer'];

            drawProgressCard(gameState, 'p1', 'science');

            // Check logs or VP state
            const player = gameState.players[0];
            expect(player.revealedVPCards).toContain('printer');
            // Should verify VP update was triggered (via implementation)
            // Implementation calls updateAllVictoryPoints.
            // Since printer gives VP, player score should increase? 
            // Only if updateAllVictoryPoints calculates it.
            // Usually VP calculation checks revealedVPCards count.

            // Check log
            const log = gameState.logs.find(l => l.message.includes('revealed Printing'));
            expect(log).toBeDefined();
        });
    });

    describe('playProgressCard', () => {
        it('plays a card and removes it from hand', () => {
            const player = gameState.players[0];
            player.progressCards = ['mining'];

            playProgressCard(gameState, 'p1', 'mining');

            expect(player.progressCards).not.toContain('mining');
            expect(gameState.logs.find(l => l.message.includes('played Mining'))).toBeDefined();
        });

        it('throws error if player does not have card', () => {
            const player = gameState.players[0];
            player.progressCards = [];

            expect(() => playProgressCard(gameState, 'p1', 'mining')).toThrow('Player does not have this card');
        });

        it('does not remove card immediately for special cards (road_building)', () => {
            const player = gameState.players[0];
            player.progressCards = ['road_building_progress'];

            playProgressCard(gameState, 'p1', 'road_building_progress');

            // Should still be in hand (deferred removal)
            expect(player.progressCards).toContain('road_building_progress');
        });
    });
});
