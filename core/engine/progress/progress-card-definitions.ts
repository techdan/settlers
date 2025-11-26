import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';

/**
 * Progress Card Definitions (Cities & Knights Expansion)
 * Defines all 24 progress cards across three categories
 *
 * Categories:
 * - Science (green): 10 cards
 * - Trade (yellow): 6 cards
 * - Politics (blue): 8 cards
 *
 * Total: 24 cards
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
        name: 'Alchemist',
        description: 'Convert any 2 resources of the same type into any 1 resource of your choice.',
        isVictoryPoint: false,
        implemented: true
    },
    crane: {
        type: 'crane',
        category: 'science',
        name: 'Crane',
        description: 'Build up to 2 city walls during your turn. City walls give 2 VP each.',
        isVictoryPoint: false,
        implemented: true
    },
    engineer: {
        type: 'engineer',
        category: 'science',
        name: 'Engineer',
        description: 'Build 1 city improvement at a discount (1 commodity instead of normal cost).',
        isVictoryPoint: false,
        implemented: true
    },
    inventor: {
        type: 'inventor',
        category: 'science',
        name: 'Inventor',
        description: 'Swap the number tokens of any 2 terrain hexes.',
        isVictoryPoint: false,
        implemented: true
    },
    irrigation: {
        type: 'irrigation',
        category: 'science',
        name: 'Irrigation',
        description: 'When you roll the dice, you may also receive resources from 1 field hex regardless of the roll.',
        isVictoryPoint: false,
        implemented: true
    },
    medicine: {
        type: 'medicine',
        category: 'science',
        name: 'Medicine',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    mining: {
        type: 'mining',
        category: 'science',
        name: 'Mining',
        description: 'When you roll the dice, you may also receive resources from 1 mountain hex regardless of the roll.',
        isVictoryPoint: false,
        implemented: true
    },
    printer: {
        type: 'printer',
        category: 'science',
        name: 'Printer',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    road_building_progress: {
        type: 'road_building_progress',
        category: 'science',
        name: 'Road Building',
        description: 'Build 2 roads for free.',
        isVictoryPoint: false,
        implemented: true
    },
    smith: {
        type: 'smith',
        category: 'science',
        name: 'Smith',
        description: 'Upgrade 1 knight to the next level for free (no resource cost).',
        isVictoryPoint: false,
        implemented: true
    },

    // TRADE CARDS (6)
    commercial_harbor: {
        type: 'commercial_harbor',
        category: 'trade',
        name: 'Commercial Harbor',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    master_merchant: {
        type: 'master_merchant',
        category: 'trade',
        name: 'Master Merchant',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    merchant: {
        type: 'merchant',
        category: 'trade',
        name: 'Merchant',
        description: 'Choose 1 resource type. You may trade that resource at a 2:1 ratio for this turn.',
        isVictoryPoint: false,
        implemented: true
    },
    merchant_fleet: {
        type: 'merchant_fleet',
        category: 'trade',
        name: 'Merchant Fleet',
        description: 'For this turn, you may trade any resources at a 2:1 ratio with the bank.',
        isVictoryPoint: false,
        implemented: true
    },
    resource_monopoly: {
        type: 'resource_monopoly',
        category: 'trade',
        name: 'Resource Monopoly',
        description: 'Choose 1 resource type. All other players must give you all their resources of that type.',
        isVictoryPoint: false,
        implemented: true
    },
    trade_monopoly: {
        type: 'trade_monopoly',
        category: 'trade',
        name: 'Trade Monopoly',
        description: 'Choose 1 commodity type. All other players must give you all their commodities of that type.',
        isVictoryPoint: false,
        implemented: true
    },

    // POLITICS CARDS (8)
    bishop: {
        type: 'bishop',
        category: 'politics',
        name: 'Bishop',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    constitution: {
        type: 'constitution',
        category: 'politics',
        name: 'Constitution',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
    deserter: {
        type: 'deserter',
        category: 'politics',
        name: 'Deserter',
        description: 'Deactivate 1 of an opponent\'s knights. That knight must be reactivated.',
        isVictoryPoint: false,
        implemented: true
    },
    diplomat: {
        type: 'diplomat',
        category: 'politics',
        name: 'Diplomat',
        description: 'Move 1 of your own knights to any location where you have a settlement or city.',
        isVictoryPoint: false,
        implemented: true
    },
    intrigue: {
        type: 'intrigue',
        category: 'politics',
        name: 'Intrigue',
        description: 'Move 1 of an opponent\'s knights to any location. That knight remains active/inactive as it was.',
        isVictoryPoint: false,
        implemented: true
    },
    saboteur: {
        type: 'saboteur',
        category: 'politics',
        name: 'Saboteur',
        description: 'Choose an opponent with at least 4 resource cards. That player must discard half of them.',
        isVictoryPoint: false,
        implemented: true
    },
    spy: {
        type: 'spy',
        category: 'politics',
        name: 'Spy',
        description: 'Look at all of an opponent\'s progress cards and steal 1 of them.',
        isVictoryPoint: false,
        implemented: true
    },
    warlord: {
        type: 'warlord',
        category: 'politics',
        name: 'Warlord',
        description: 'Activate all of your knights for free (no wheat cost).',
        isVictoryPoint: false,
        implemented: true
    },
    wedding: {
        type: 'wedding',
        category: 'politics',
        name: 'Wedding',
        description: 'This card is worth 1 victory point.',
        isVictoryPoint: true,
        implemented: true
    },
};

/**
 * Create progress card decks
 * Returns three shuffled decks (science, trade, politics)
 */
export function createProgressDecks(): {
    science: ProgressCardType[];
    trade: ProgressCardType[];
    politics: ProgressCardType[];
} {
    // Define deck compositions
    const scienceDeck: ProgressCardType[] = [
        'alchemist',
        'crane',
        'engineer',
        'inventor',
        'irrigation',
        'medicine',
        'mining',
        'printer',
        'road_building_progress',
        'smith',
    ];

    const tradeDeck: ProgressCardType[] = [
        'commercial_harbor',
        'master_merchant',
        'merchant',
        'merchant_fleet',
        'resource_monopoly',
        'trade_monopoly',
    ];

    const politicsDeck: ProgressCardType[] = [
        'bishop',
        'constitution',
        'deserter',
        'diplomat',
        'intrigue',
        'saboteur',
        'spy',
        'warlord',
        'wedding',
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
