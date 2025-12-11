'use client';

import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { getCardMetadata } from '@/core/engine/progress/progress-card-definitions';
import { Tooltip } from '@/components/ui/tooltip';

interface ProgressCardDiscardDialogProps {
    cards: ProgressCardType[];
    maxCards: number;
    onDiscard: (cardsToDiscard: ProgressCardType[]) => Promise<void>;
    onClose: () => void;
    turnContext: 'own_turn' | 'other_turn';
}

export const ProgressCardDiscardDialog: React.FC<ProgressCardDiscardDialogProps> = ({
    cards,
    maxCards,
    onDiscard,
    onClose,
    turnContext
}) => {
    const [selectedCards, setSelectedCards] = useState<ProgressCardType[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const cardsToDiscard = cards.length - maxCards;
    const isOtherTurn = turnContext === 'other_turn';
    const allowDeferral = !isOtherTurn;

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
        setError('');
        try {
            await onDiscard(selectedCards);
            onClose();
        } catch (e: any) {
            console.error('Failed to discard cards:', e);
            setError(e.message || 'Failed to discard cards. Please try again.');
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
                    {isOtherTurn ? (
                        <strong className="text-amber-400">You gained an extra card on another player's turn. Discard now to return to {maxCards}.</strong>
                    ) : (
                        <strong className="text-amber-400">You can briefly hold a 5th card on your turn, but must be at {maxCards} or fewer before ending it.</strong>
                    )}
                    <br />
                    <strong className="text-amber-400">Select {cardsToDiscard} card{cardsToDiscard !== 1 ? 's' : ''} to discard:</strong>
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {cards.map((card, index) => {
                        const metadata = getCardMetadata(card);
                        const isSelected = selectedCards.includes(card);

                        return (
                            <Tooltip
                                key={`${card}-${index}`}
                                content={metadata.description}
                                placement="top"
                                tooltipClassName="whitespace-pre-line max-w-xs"
                            >
                                <button
                                    onClick={() => toggleCard(card)}
                                    disabled={isSubmitting}
                                    className={`
                                        p-4 rounded-lg border-2 transition-all w-full
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
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-4">
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

                    {allowDeferral && (
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="
                                px-4 py-3 rounded-lg font-bold transition-all
                                bg-slate-700 text-slate-200 hover:bg-slate-600 cursor-pointer
                                disabled:opacity-50 disabled:cursor-not-allowed
                            "
                        >
                            Keep Playing
                        </button>
                    )}
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center">
                    Progress card hand limit is 4. If you gain a 5th on someone else's turn, discard immediately. On your turn, discard or play cards before ending.
                </p>
            </div>
        </div>
    );
};
