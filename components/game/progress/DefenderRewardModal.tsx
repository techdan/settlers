import React, { useState } from 'react';
import type { GameState } from '@/lib/types';
import type { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { claimDefenderProgressCard } from '@/app/actions';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

const DECKS: { category: ProgressCardCategory; label: string }[] = [
    { category: 'science', label: 'Science · Green' },
    { category: 'trade', label: 'Trade · Yellow' },
    { category: 'politics', label: 'Politics · Blue' },
];

export function DefenderRewardModal({ gameState, playerId }: { gameState: GameState; playerId: string }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nextPlayerId = gameState.pendingDefenderCardDraws?.[0];
    const canChoose = nextPlayerId === playerId;
    const nextPlayer = gameState.players.find(p => p.id === nextPlayerId);

    async function claim(category: ProgressCardCategory) {
        if (isSubmitting || !canChoose) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await claimDefenderProgressCard(gameState.roomId, playerId, category);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not claim your reward. Please try again.');
            setIsSubmitting(false);
        }
    }

    return (
        <TabletopModal title="You helped defeat the barbarians!"
            description="You tied for the strongest defense. Instead of a victory point, you earn one progress card. Choose any deck, regardless of your city improvements.">
            {canChoose ? (
                <div className="grid gap-3">
                    {DECKS.map(({ category, label }) => (
                        <TabletopButton key={category} className="w-full" disabled={isSubmitting || gameState.progressDecks?.[category].length === 0}
                            onClick={() => claim(category)}>
                            {label}{gameState.progressDecks?.[category].length === 0 ? ' (empty)' : ''}
                        </TabletopButton>
                    ))}
                    {isSubmitting && <p role="status">Drawing your reward…</p>}
                </div>
            ) : <p role="status">Waiting for {nextPlayer?.name ?? 'the preceding defender'} to choose. Your reward is saved in the queue.</p>}
            {error && <p role="alert" className="mt-3 text-[var(--ui-danger)]">{error}</p>}
        </TabletopModal>
    );
}
