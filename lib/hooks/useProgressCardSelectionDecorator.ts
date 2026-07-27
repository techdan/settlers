import { useCallback, useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';

export type CardHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => TResult;

export type ProgressCardHandlerDecorator = <TArgs extends unknown[], TResult>(
    cardType: ProgressCardType,
    hasFollowupStep: boolean,
    handler: CardHandler<TArgs, TResult>
) => CardHandler<TArgs, TResult>;

export function useProgressCardSelectionDecorator() {
    const [selectedCard, setSelectedCard] = useState<ProgressCardType | null>(null);

    const decorateCardHandler: ProgressCardHandlerDecorator = useCallback((cardType, hasFollowupStep, handler) => {
        return (...args) => {
            if (hasFollowupStep) {
                setSelectedCard(prev => (prev === cardType ? null : cardType));
            } else {
                setSelectedCard(null);
            }

            return handler(...args);
        };
    }, []);

    const clearSelectedCard = useCallback(() => setSelectedCard(null), []);

    return {
        selectedCard,
        decorateCardHandler,
        clearSelectedCard
    };
}
