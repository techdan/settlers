import { GameState } from '@/lib/types';
import { EventDieFace, EVENT_COLOR_TO_CATEGORY, ProgressCardCategory } from '@/core/rules/commodity-constants';
import { canDrawProgressCard } from '@/core/engine/improvements/improvement-manager';

/**
 * Event Die Manager (Cities & Knights Expansion)
 * Handles event die rolling and result processing
 *
 * Event die has 6 faces:
 * - 3 faces: Ship (barbarian advances)
 * - 1 face: Green/Science (progress card draw)
 * - 1 face: Yellow/Trade (progress card draw)
 * - 1 face: Blue/Politics (progress card draw)
 *
 * When a color is rolled, all players with improvement level ≥3 in that
 * category draw a progress card.
 */

/**
 * Roll the event die
 * Returns a random event die face
 *
 * @returns Event die face result
 */
export function rollEventDie(): EventDieFace {
    const roll = Math.random();

    // 50% chance of ship (3 faces out of 6)
    if (roll < 0.5) {
        return 'ship';
    }

    // 50% chance of colors (3 faces out of 6, split evenly)
    // Each color has 1/6 probability (16.67%)
    if (roll < 0.667) {
        return 'green';
    } else if (roll < 0.834) {
        return 'yellow';
    } else {
        return 'blue';
    }
}

/**
 * Process event die result
 * Updates game state based on die roll
 *
 * @param gameState - Current game state
 * @param dieFace - Event die result
 */
export function processEventDieRoll(gameState: GameState, dieFace: EventDieFace): void {
    // Skip if not C&K mode
    if (gameState.gameMode !== 'cities_and_knights') return;

    // Store the roll result
    gameState.eventDieRoll = {
        face: dieFace,
        timestamp: Date.now()
    };

    if (dieFace === 'ship') {
        // Barbarian advances
        processBarbarianAdvance(gameState);
    } else {
        // Progress card draw for eligible players
        processProgressCardDraw(gameState, dieFace);
    }
}

/**
 * Process barbarian advance when ship is rolled
 * Advances barbarian position and triggers attack at position 7
 *
 * @param gameState - Current game state
 */
function processBarbarianAdvance(gameState: GameState): void {
    // Initialize barbarian position if needed
    if (gameState.barbarianPosition === undefined) {
        gameState.barbarianPosition = 0;
    }

    // Advance barbarian
    gameState.barbarianPosition++;

    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Barbarian ship advances to position ${gameState.barbarianPosition}`
    });

    // Check if barbarian attacks (position 7)
    if (gameState.barbarianPosition >= 7) {
        // Trigger barbarian attack (handled by barbarian-manager)
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: 'Barbarian attack! Resolve attack now.'
        });

        // Set phase to barbarian_attack so the attack must be resolved
        // before continuing the game
        gameState.phase = 'barbarian_attack';
    }
}

/**
 * Process progress card draw for a color
 * All players with improvement level ≥3 in the matching category draw a card
 *
 * @param gameState - Current game state
 * @param colorFace - Color rolled (green/yellow/blue)
 */
function processProgressCardDraw(gameState: GameState, colorFace: Exclude<EventDieFace, 'ship'>): void {
    const category = EVENT_COLOR_TO_CATEGORY[colorFace];

    // Find all eligible players
    const eligiblePlayers = gameState.players.filter(player =>
        canDrawProgressCard(player, category)
    );

    if (eligiblePlayers.length === 0) {
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Event die: ${colorFace} (${category}). No players qualify to draw progress cards.`
        });
        return;
    }

    // Log which players will draw
    const playerNames = eligiblePlayers.map(p => p.name).join(', ');
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `Event die: ${colorFace} (${category}). ${playerNames} may draw progress cards.`
    });

    // Note: Actual card drawing is handled by progress-card-manager
    // This just logs who is eligible
    // The service layer will call drawProgressCard for each eligible player
}

/**
 * Get the improvement category for an event die color
 *
 * @param colorFace - Color face (green/yellow/blue)
 * @returns Progress card category
 */
export function getCategoryFromColor(colorFace: Exclude<EventDieFace, 'ship'>): ProgressCardCategory {
    return EVENT_COLOR_TO_CATEGORY[colorFace];
}

/**
 * Get all players eligible to draw progress cards for a category
 *
 * @param gameState - Current game state
 * @param category - Progress card category
 * @returns Array of eligible player IDs
 */
export function getEligiblePlayersForCardDraw(
    gameState: GameState,
    category: ProgressCardCategory
): string[] {
    return gameState.players
        .filter(player => canDrawProgressCard(player, category))
        .map(player => player.id);
}
