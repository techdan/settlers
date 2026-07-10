import React from 'react';
import { GameState } from '@/lib/types';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { CardStack, ProgressDeckBack } from '@/themes/tabletop';

interface ProgressDecksPanelProps {
    gameState: GameState;
}

export const ProgressDecksPanel: React.FC<ProgressDecksPanelProps> = ({ gameState }) => {
    // Only show in C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        return null;
    }

    // Get deck counts
    const progressDecks = gameState.progressDecks;
    if (!progressDecks) {
        return null;
    }

    const scienceCount = progressDecks.science?.length ?? 0;
    const tradeCount = progressDecks.trade?.length ?? 0;
    const politicsCount = progressDecks.politics?.length ?? 0;

    const decks: Array<{ category: ProgressCardCategory; count: number }> = [
        { category: 'science', count: scienceCount },
        { category: 'trade', count: tradeCount },
        { category: 'politics', count: politicsCount },
    ];

    return (
        <div className="bg-slate-800/90 p-3 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Progress Decks
            </h3>

            <div className="flex gap-3 px-1 pb-1">
                {decks.map(deck => (
                    <CardStack key={deck.category} count={deck.count} width={44}>
                        <ProgressDeckBack category={deck.category} width={44} />
                    </CardStack>
                ))}
            </div>
        </div>
    );
};
