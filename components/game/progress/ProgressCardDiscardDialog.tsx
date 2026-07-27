'use client';

import React, { useState } from 'react';
import { ProgressCardType } from '@/lib/types/player';
import { getCardMetadata } from '@/core/engine/progress/progress-card-definitions';
import { Tooltip } from '@/components/ui/tooltip';
import { ProgressCardFace } from '@/themes/tabletop/cards';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '@/components/game/ui/TabletopModal';

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
        } catch (error: unknown) {
            console.error('Failed to discard cards:', error);
            setError(
                error instanceof Error && error.message
                    ? error.message
                    : 'Failed to discard cards. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <TabletopModal
            title="Discard Progress Cards"
            description={`You have ${cards.length} progress cards but can only keep ${maxCards}.`}
            width="lg"
            onClose={allowDeferral && !isSubmitting ? onClose : undefined}
            footer={(
                <>
                    {allowDeferral ? <TabletopButton onClick={onClose} disabled={isSubmitting}>Keep Playing</TabletopButton> : null}
                    <TabletopButton variant="danger" onClick={handleSubmit} disabled={selectedCards.length !== cardsToDiscard || isSubmitting}>
                        {isSubmitting ? 'Discarding...' : `Discard ${selectedCards.length}/${cardsToDiscard}`}
                    </TabletopButton>
                </>
            )}
        >
                <p className="mb-4 text-[var(--ui-muted)]">
                    You have {cards.length} progress cards but can only keep {maxCards} at the end of your turn.
                    <br />
                    {isOtherTurn ? (
                        <strong className="text-amber-400">You gained an extra card on another player&apos;s turn. Discard now to return to {maxCards}.</strong>
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
                                    aria-pressed={isSelected}
                                    className={`flex w-full flex-col items-center rounded-lg border-2 p-3 transition-all ${tabletopOptionClass(isSelected, isSubmitting)} ${isSelected ? 'scale-95' : ''}`}
                                >
                                    <ProgressCardFace type={card} width={82} />
                                    <div className="mt-2 text-sm font-bold text-[var(--ui-text)]">{metadata.name}</div>
                                    <div className="text-xs capitalize text-[var(--ui-muted)]">{metadata.category}</div>
                                    {isSelected && (
                                        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--ui-danger)]">
                                            <TabletopStatusIcon type="confirm" size={14} /> Selected
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

                <p className="mt-4 text-center text-xs text-[var(--ui-muted)]">
                    Progress card hand limit is 4. If you gain a 5th on someone else&apos;s turn, discard immediately. On your turn, discard or play cards before ending.
                </p>
        </TabletopModal>
    );
};
