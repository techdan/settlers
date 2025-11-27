'use client';

import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { getCardMetadata } from '@/core/engine/progress/progress-card-definitions';

interface ProgressCardDiscardDialogProps {
    cards: ProgressCardType[];
    maxCards: number;
    onDiscard: (cardsToDiscard: ProgressCardType[]) => Promise<void>;
    onClose: () => void;
}

export const ProgressCardDiscardDialog: React.FC<ProgressCardDiscardDialogProps> = ({
    cards,
    maxCards,
    onDiscard,
    onClose
}) => {
    const [selectedCards, setSelectedCards] = useState<ProgressCardType[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const cardsToDiscard = cards.length - maxCards;

    const toggleCard = (card: ProgressCardType) => {
        if (selectedCards.includes(card)) {
            setSelectedCards(selectedCards.filter(c => c !== card));
        } else {
            if (selectedCards.length < cardsToDiscard) {
                setSelectedCards([...selectedCards, card]);
            }
        }
    };

    const handleSubmit = async () => {
        if (selectedCards.length !== cardsToDiscard) return;

        setIsSubmitting(true);
        try {
            await onDiscard(selectedCards);
            onClose();
        } catch (error) {
            console.error('Failed to discard cards:', error);
            alert('Failed to discard cards. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border-2 border-amber-500">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Discard Progress Cards
                </h2>

                <p className="text-slate-300 mb-4">
                    You have {cards.length} progress cards but can only keep {maxCards} at the end of your turn.
                    <br />
                    <strong className="text-amber-400">Select {cardsToDiscard} card{cardsToDiscard !== 1 ? 's' : ''} to discard:</strong>
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {cards.map((card, index) => {
                        const metadata = getCardMetadata(card);
                        const isSelected = selectedCards.includes(card);

                        return (
                            <button
                                key={`${card}-${index}`}
                                onClick={() => toggleCard(card)}
                                disabled={isSubmitting}
                                className={`
                                    p-4 rounded-lg border-2 transition-all
                                    ${isSelected
                                        ? 'bg-red-600 border-red-400 scale-95'
                                        : 'bg-slate-700 border-slate-600 hover:border-slate-400'
                                    }
                                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <div className="text-sm font-bold text-white mb-1">
                                    {metadata.name}
                                </div>
                                <div className="text-xs text-slate-300">
                                    {metadata.category}
                                </div>
                                {isSelected && (
                                    <div className="text-xs text-red-200 mt-2 font-bold">
                                        ✓ Selected
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={selectedCards.length !== cardsToDiscard || isSubmitting}
                        className={`
                            flex-1 px-6 py-3 rounded-lg font-bold transition-all
                            ${selectedCards.length === cardsToDiscard && !isSubmitting
                                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            }
                        `}
                    >
                        {isSubmitting ? 'Discarding...' : `Discard ${selectedCards.length}/${cardsToDiscard}`}
                    </button>
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center">
                    Note: You can hold up to 5 cards during other players' turns
                </p>
            </div>
        </div>
    );
};
