import { describe, expect, it } from 'vitest';
import {
    createDevCardDeck,
    drawDevCard,
    hasCardsRemaining,
    getRemainingCardCount
} from '../dev-card-manager';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { DevCardType } from '@/lib/types';

describe('Dev Card Manager', () => {
    describe('createDevCardDeck', () => {
        it('creates a full deck with correct composition', () => {
            const deck = createDevCardDeck();

            // Calculate expected total from constants
            // typically: knight: 14, vp: 5, year_of_plenty: 2, road_building: 2, monopoly: 2 -> 25 total
            const expectedTotal = Object.values(GAME_CONSTANTS.DEV_CARD_DECK).reduce((a, b) => a + b, 0);
            expect(deck).toHaveLength(expectedTotal);

            // Verify counts of each type
            const counts: Record<string, number> = {};
            deck.forEach(card => {
                counts[card] = (counts[card] || 0) + 1;
            });

            Object.entries(GAME_CONSTANTS.DEV_CARD_DECK).forEach(([type, expectedCount]) => {
                expect(counts[type]).toBe(expectedCount);
            });
        });

        it('shuffles the deck', () => {
            // Create two decks and verify they are not identical order
            // (There is a tiny chance they are identical, but very small for 25 cards)
            const deck1 = createDevCardDeck();
            const deck2 = createDevCardDeck();

            expect(deck1).not.toEqual(deck2);
        });
    });

    describe('drawDevCard', () => {
        it('draws a card from the deck', () => {
            const deck = createDevCardDeck();
            const initialLength = deck.length;
            const topCard = deck[initialLength - 1]; // Array.pop takes from end

            const drawn = drawDevCard(deck);

            expect(drawn).toBe(topCard);
            expect(deck).toHaveLength(initialLength - 1);
        });

        it('returns null if deck is empty', () => {
            const deck: DevCardType[] = [];
            expect(drawDevCard(deck)).toBeNull();
        });
    });

    describe('Deck Helpers', () => {
        it('checks hasCardsRemaining', () => {
            expect(hasCardsRemaining(['knight'])).toBe(true);
            expect(hasCardsRemaining([])).toBe(false);
        });

        it('gets remaining card count', () => {
            expect(getRemainingCardCount(['knight', 'monopoly'])).toBe(2);
        });
    });
});
