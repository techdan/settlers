import { GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { getCardMetadata, isCardImplemented } from './progress-card-definitions';
import { checkVictoryCondition, updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { getCardExecutor } from './CardExecutor';

/**
 * Progress Card Manager (Cities & Knights Expansion)
 * Handles drawing and playing progress cards
 */

/**
 * Draw a progress card from a deck
 *
 * @param gameState - Current game state
 * @param playerId - Player drawing the card
 * @param category - Card category to draw from
 * @returns Drawn card type, or null if deck empty
 */
export function drawProgressCard(
    gameState: GameState,
    playerId: string,
    category: ProgressCardCategory
): ProgressCardType | null {
    if (!gameState.progressDecks) {
        // Lazy-create decks if missing (e.g., legacy game state)
        const { createProgressDecks } = require('@/core/engine/progress/progress-card-definitions');
        gameState.progressDecks = createProgressDecks();
    }

    // TypeScript needs this reassurance that progressDecks exists
    if (!gameState.progressDecks) {
        throw new Error('Failed to initialize progress decks');
    }

    const deck = gameState.progressDecks[category];
    if (deck.length === 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${category} progress card deck is empty!`
        });
        return null;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    // Draw card from top of deck
    const card = deck.shift()!;
    const cardMeta = getCardMetadata(card);

    // Check if this is a VP card (Printer or Constitution)
    const isVPCard = card === 'printer' || card === 'constitution';

    if (isVPCard) {
        // VP cards are auto-played immediately and revealed
        if (!player.revealedVPCards) {
            player.revealedVPCards = [];
        }
        player.revealedVPCards.push(card);

        // Log VP card reveal with special message
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} revealed ${cardMeta.name} for +1 VP!`,
            playerId
        });

        // Track recency for UI highlight and recalc VPs immediately
        gameState.lastVPCardGain = {
            playerId,
            cardType: card,
            timestamp: Date.now()
        };

        updateAllVictoryPoints(gameState);

        const winnerId = checkVictoryCondition(gameState);
        if (winnerId) {
            gameState.winner = winnerId;
            gameState.phase = 'game_over';

            const winner = gameState.players.find(p => p.id === winnerId);
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`
            });
        }
    } else {
        // Regular progress cards go into hand
        if (!player.progressCards) {
            player.progressCards = [];
        }
        player.progressCards.push(card);

        // Log regular card draw (hide specific card name; category only)
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} drew a ${category} progress card`,
            playerId
        });
    }

    return card;
}

/**
 * Play a progress card
 *
 * @param gameState - Current game state
 * @param playerId - Player playing the card
 * @param cardType - Card to play
 * @param options - Card-specific options
 */
export function playProgressCard(
    gameState: GameState,
    playerId: string,
    cardType: ProgressCardType,
    options?: any
): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Defer removal for cards that can be cancelled or have multi-step completion
    const deferRemoval = cardType === 'road_building_progress' || cardType === 'commercial_harbor' || cardType === 'treason';

    // Check player has the card
    if (!player.progressCards || !player.progressCards.includes(cardType)) {
        throw new Error('Player does not have this card');
    }

    // Remove card from hand unless deferred (Road Building waits until finish)
    if (!deferRemoval) {
        const index = player.progressCards.indexOf(cardType);
        player.progressCards.splice(index, 1);
    }

    const cardMeta = getCardMetadata(cardType);
    const isVPCard = cardType === 'printer' || cardType === 'constitution';

    // Log card play (Alchemy handled inside its effect for combined roll/play message)
    if (cardType !== 'alchemist' && cardType !== 'road_building_progress') {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} played ${cardMeta.name}`,
            playerId
        });
    }

    if (isVPCard) {
        if (!player.revealedVPCards) {
            player.revealedVPCards = [];
        }
        if (!player.revealedVPCards.includes(cardType)) {
            player.revealedVPCards.push(cardType);
        }

        gameState.lastVPCardGain = {
            playerId,
            cardType,
            timestamp: Date.now()
        };

        updateAllVictoryPoints(gameState);
        const winnerId = checkVictoryCondition(gameState);
        if (winnerId) {
            gameState.winner = winnerId;
            gameState.phase = 'game_over';

            const winner = gameState.players.find(p => p.id === winnerId);
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`
            });
        }
    }

    // Execute card effect
    if (isCardImplemented(cardType)) {
        executeProgressCardEffect(gameState, playerId, cardType, options);
    } else {
        // Stub: card not yet implemented
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${cardMeta.name} effect not yet implemented`,
            playerId
        });
    }
}

/**
 * Execute a progress card's effect
 *
 * @param gameState - Current game state
 * @param playerId - Player playing the card
 * @param cardType - Card being played
 * @param options - Card-specific options
 */
function executeProgressCardEffect(
    gameState: GameState,
    playerId: string,
    cardType: ProgressCardType,
    options?: any
): void {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Route ALL cards through CardExecutor (new system)
    const executor = getCardExecutor();
    const newState = executor.execute(cardType, gameState, playerId, options);
    // Copy back the modified state (CardExecutor modifies in place, but we return it for consistency)
    Object.assign(gameState, newState);
}
