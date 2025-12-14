import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';

/**
 * Progress Card Definitions (Cities & Knights Expansion)
 * Defines all 25 unique progress card types across three categories
 *
 * Categories:
 * - Science (green): 10 unique cards, 18 total cards in deck
 * - Trade (yellow): 6 unique cards, 18 total cards in deck
 * - Politics (blue): 9 unique cards, 18 total cards in deck
 *
 * Total: 25 unique card types, 54 total cards across all decks
 */

export interface ProgressCardMetadata {
    type: ProgressCardType;
    category: ProgressCardCategory;
    name: string;
    description: string;
    isVictoryPoint: boolean;
    implemented: boolean; // Whether the effect is fully implemented
}

/**
 * All progress card definitions
 */
export const PROGRESS_CARD_DEFINITIONS: Record<ProgressCardType, ProgressCardMetadata> = {
    // SCIENCE CARDS (10)
    alchemist: {
        type: 'alchemist',
        category: 'science',
        name: 'Alchemy',
        description: 'Play at start of your turn, before rolling. Choose results of the production dice; roll the event die normally.',
        isVictoryPoint: false,
        implemented: true
    },
    crane: {
        type: 'crane',
        category: 'science',
        name: 'Crane',
        description: 'Build one city improvement for 1 commodity less.',
        isVictoryPoint: false,
        implemented: true
    },
    engineer: {
        type: 'engineer',
        category: 'science',
        name: 'Engineering',
        description: 'Build one city wall for free.',
        isVictoryPoint: false,
        implemented: true
    },
    inventor: {
        type: 'inventor',
        category: 'science',
        name: 'Inventor',
        description: 'Swap any two number tokens except 2, 6, 8, or 12.',
        isVictoryPoint: false,
        implemented: true
    },
    irrigation: {
        type: 'irrigation',
        category: 'science',
        name: 'Irrigation',
        description: 'Take 2 wheat for each fields hex adjacent to one of your buildings.',
        isVictoryPoint: false,
        implemented: true
    },
    medicine: {
        type: 'medicine',
        category: 'science',
        name: 'Medicine',
        description: 'Upgrade a settlement to a city for 2 ore + 1 wheat.',
        isVictoryPoint: false,
        implemented: true
    },
    mining: {
        type: 'mining',
        category: 'science',
        name: 'Mining',
        description: 'Take 2 ore for each mountains hex adjacent to one of your buildings.',
        isVictoryPoint: false,
        implemented: true
    },
    printer: {
        type: 'printer',
        category: 'science',
        name: 'Printing',
        description: 'Play immediately. Worth 1 VP.',
        isVictoryPoint: true,
        implemented: true
    },
    road_building_progress: {
        type: 'road_building_progress',
        category: 'science',
        name: 'Road Building',
        description: 'Build two roads for free.',
        isVictoryPoint: false,
        implemented: true
    },
    smith: {
        type: 'smith',
        category: 'science',
        name: 'Smithing',
        description: 'Promote up to two knights for free.',
        isVictoryPoint: false,
        implemented: true
    },

    // TRADE CARDS (6)
    commercial_harbor: {
        type: 'commercial_harbor',
        category: 'trade',
        name: 'Commercial Harbor',
        description: 'Offer 1 resource to each player; each must give you 1 commodity if they have one. Otherwise, you take your resource back.',
        isVictoryPoint: false,
        implemented: true
    },
    guild_dues: {
        type: 'guild_dues',
        category: 'trade',
        name: 'Guild Dues',
        description: 'Choose a player with more VPs than you. Look at their hand and take any 2 cards.',
        isVictoryPoint: false,
        implemented: true
    },
    merchant: {
        type: 'merchant',
        category: 'trade',
        name: 'Merchant',
        description: 'Place Merchant on a resource hex adjacent to one of your buildings. While you control it: 2:1 trade of that resource +1 VP.',
        isVictoryPoint: false,
        implemented: true
    },
    merchant_fleet: {
        type: 'merchant_fleet',
        category: 'trade',
        name: 'Merchant Fleet',
        description: 'Choose 1 resource or commodity. Trade it at 2:1 with supply for the rest of this turn.',
        isVictoryPoint: false,
        implemented: true
    },
    resource_monopoly: {
        type: 'resource_monopoly',
        category: 'trade',
        name: 'Resource Monopoly',
        description: 'Name a resource. Each player must give you up to 2 of that resource.',
        isVictoryPoint: false,
        implemented: true
    },
    trade_monopoly: {
        type: 'trade_monopoly',
        category: 'trade',
        name: 'Trade Monopoly',
        description: 'Name a commodity. Each player must give you 1 of that commodity if they have it.',
        isVictoryPoint: false,
        implemented: true
    },

    // POLITICS CARDS (9)
    constitution: {
        type: 'constitution',
        category: 'politics',
        name: 'Constitution',
        description: 'Play immediately. Worth 1 VP.',
        isVictoryPoint: true,
        implemented: true
    },
    diplomat: {
        type: 'diplomat',
        category: 'politics',
        name: 'Diplomat',
        description: 'Remove an open road. If it is yours, you may rebuild one road for free.',
        isVictoryPoint: false,
        implemented: true
    },
    encouragement: {
        type: 'encouragement',
        category: 'politics',
        name: 'Encouragement',
        description: 'Activate all your knights for free.',
        isVictoryPoint: false,
        implemented: true
    },
    espionage: {
        type: 'espionage',
        category: 'politics',
        name: 'Espionage',
        description: 'Look at another player\'s progress cards; take 1.',
        isVictoryPoint: false,
        implemented: true
    },
    intrigue: {
        type: 'intrigue',
        category: 'politics',
        name: 'Intrigue',
        description: 'Displace a knight on an intersection connected to one of your routes.',
        isVictoryPoint: false,
        implemented: true
    },
    saboteur: {
        type: 'saboteur',
        category: 'politics',
        name: 'Sabotage',
        description: 'Players with equal or more VPs discard half their resource/commodity cards.',
        isVictoryPoint: false,
        implemented: true
    },
    taxation: {
        type: 'taxation',
        category: 'politics',
        name: 'Taxation',
        description: 'Move the robber. Steal 1 random card from each player with a building on that hex.',
        isVictoryPoint: false,
        implemented: true
    },
    treason: {
        type: 'treason',
        category: 'politics',
        name: 'Treason',
        description: 'Choose a player; they remove a knight. You place a knight of equal or lower strength with same status.',
        isVictoryPoint: false,
        implemented: true
    },
    wedding: {
        type: 'wedding',
        category: 'politics',
        name: 'Wedding',
        description: 'Each player with more VPs than you must give you 2 cards of their choice.',
        isVictoryPoint: false,
        implemented: true
    },
};

/**
 * Create progress card decks
 * Returns three shuffled decks (science, trade, politics)
 * Each deck has 18 cards total (54 cards across all decks)
 */
export function createProgressDecks(): {
    science: ProgressCardType[];
    trade: ProgressCardType[];
    politics: ProgressCardType[];
} {
    // Define deck compositions with correct quantities (18 cards per deck)

    // Science deck - 18 cards
    const scienceDeck: ProgressCardType[] = [
        'alchemist', 'alchemist', // 2
        'crane', 'crane', // 2
        'engineer', // 1
        'inventor', 'inventor', // 2
        'irrigation', 'irrigation', // 2
        'medicine', 'medicine', // 2
        'mining', 'mining', // 2
        'road_building_progress', 'road_building_progress', // 2
        'smith', 'smith', // 2
        'printer', // 1 (VP card)
    ];

    // Trade deck - 18 cards
    const tradeDeck: ProgressCardType[] = [
        'commercial_harbor', 'commercial_harbor', // 2
        'guild_dues', 'guild_dues', // 2 (Guild Master in official rules)
        'merchant_fleet', 'merchant_fleet', // 2 (Master Merchant in official rules)
        'merchant', 'merchant', 'merchant', 'merchant', 'merchant', 'merchant', // 6
        'resource_monopoly', 'resource_monopoly', 'resource_monopoly', 'resource_monopoly', // 4
        'trade_monopoly', 'trade_monopoly', // 2
    ];

    // Politics deck - 18 cards
    const politicsDeck: ProgressCardType[] = [
        'encouragement', 'encouragement', // 2 (Bishop in official rules)
        'diplomat', 'diplomat', // 2
        'treason', 'treason', // 2 (Deserter in official rules)
        'intrigue', 'intrigue', // 2
        'saboteur', 'saboteur', // 2
        'espionage', 'espionage', 'espionage', // 3 (Spy in official rules)
        'taxation', 'taxation', // 2 (Warlord in official rules)
        'wedding', 'wedding', // 2
        'constitution', // 1 (VP card)
    ];

    // Shuffle each deck
    return {
        science: shuffleDeck([...scienceDeck]),
        trade: shuffleDeck([...tradeDeck]),
        politics: shuffleDeck([...politicsDeck]),
    };
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
function shuffleDeck<T>(deck: T[]): T[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get all cards in a category
 */
export function getCardsInCategory(category: ProgressCardCategory): ProgressCardType[] {
    return Object.values(PROGRESS_CARD_DEFINITIONS)
        .filter(card => card.category === category)
        .map(card => card.type);
}

/**
 * Get card metadata
 */
export function getCardMetadata(cardType: ProgressCardType): ProgressCardMetadata {
    return PROGRESS_CARD_DEFINITIONS[cardType];
}

/**
 * Check if a card is implemented
 */
export function isCardImplemented(cardType: ProgressCardType): boolean {
    return PROGRESS_CARD_DEFINITIONS[cardType].implemented;
}

/**
 * Check if a card is a victory point card
 */
export function isVictoryPointCard(cardType: ProgressCardType): boolean {
    return PROGRESS_CARD_DEFINITIONS[cardType].isVictoryPoint;
}
