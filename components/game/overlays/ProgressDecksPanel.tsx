import React from 'react';
import { GameState } from '@/lib/types';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';

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

    // Deck info with colors
    const decks: Array<{
        category: ProgressCardCategory;
        count: number;
        label: string;
        color: string;
        bgColor: string;
        icon: string;
    }> = [
        {
            category: 'science',
            count: scienceCount,
            label: 'Science',
            color: 'text-green-400',
            bgColor: 'bg-green-900/50',
            icon: '🔬',
        },
        {
            category: 'trade',
            count: tradeCount,
            label: 'Trade',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-900/50',
            icon: '💰',
        },
        {
            category: 'politics',
            count: politicsCount,
            label: 'Politics',
            color: 'text-blue-400',
            bgColor: 'bg-blue-900/50',
            icon: '⚖️',
        },
    ];

    return (
        <div className="bg-slate-800/90 p-3 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Progress Card Decks
            </h3>

            <div className="flex gap-2">
                {decks.map((deck) => (
                    <div
                        key={deck.category}
                        className={`flex-1 ${deck.bgColor} p-2 rounded flex flex-col items-center justify-center`}
                    >
                        <div className="text-lg mb-0.5">{deck.icon}</div>
                        <div className="text-[10px] text-slate-300 mb-1">{deck.label}</div>
                        <div className={`text-xl font-bold ${deck.color}`}>{deck.count}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
