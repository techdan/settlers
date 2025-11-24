import { DevCardType } from '@/lib/types';
import { GAME_CONSTANTS } from '@/core/rules/constants';

/**
 * Development Card Manager
 * Handles dev card deck creation and drawing
 */

/**
 * Create a shuffled development card deck
 * 
 * @returns Shuffled array of dev cards
 */
export function createDevCardDeck(): DevCardType[] {
    const deck: DevCardType[] = [];

    // Add cards based on composition
    Object.entries(GAME_CONSTANTS.DEV_CARD_DECK).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
            deck.push(type as DevCardType);
        }
    });

    // Shuffle using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

/**
 * Draw a card from the deck
 * 
 * @param deck - Dev card deck
 * @returns Drawn card, or null if deck is empty
 */
export function drawDevCard(deck: DevCardType[]): DevCardType | null {
    return deck.pop() || null;
}

/**
 * Check if deck has cards remaining
 * 
 * @param deck - Dev card deck
 * @returns true if deck has cards
 */
export function hasCardsRemaining(deck: DevCardType[]): boolean {
    return deck.length > 0;
}

/**
 * Get remaining card count
 * 
 * @param deck - Dev card deck
 * @returns Number of cards remaining
 */
export function getRemainingCardCount(deck: DevCardType[]): number {
    return deck.length;
}
