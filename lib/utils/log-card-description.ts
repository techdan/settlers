import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { DEV_CARD_DEFINITIONS } from '@/core/rules/dev-card-definitions';

const playedCards = [
    ...Object.entries(DEV_CARD_DEFINITIONS).map(([type, card]) => ({
        ...card,
        pattern: new RegExp(`\\bplayed a ${type.replaceAll('_', ' ')} card\\b`, 'i'),
    })),
    ...Object.values(PROGRESS_CARD_DEFINITIONS).sort((a, b) => b.name.length - a.name.length).map(card => ({
        ...card,
        pattern: new RegExp(`\\b(?:played|revealed) ${card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    })),
];

/** Read only publicly named plays/reveals, including logs saved before tooltips existed. */
export function getLogCardDescription(message: string): { name: string; description: string } | undefined {
    return playedCards.find(card => card.pattern.test(message));
}
