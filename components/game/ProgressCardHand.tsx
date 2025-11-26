import React, { useState, useTransition } from 'react';
import { PlayerState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';

interface ProgressCardHandProps {
    player: PlayerState;
    roomId: string;
    onPlayCard: (cardType: ProgressCardType) => Promise<void>;
}

// Card descriptions for tooltip/display
const PROGRESS_CARD_INFO: Record<ProgressCardType, { name: string; description: string; category: 'science' | 'trade' | 'politics' }> = {
    // Science cards (green)
    alchemist: { name: 'Alchemist', description: 'Convert 2 resources of one type into 1 resource of any type', category: 'science' },
    crane: { name: 'Crane', description: 'Build a city wall or move your city wall', category: 'science' },
    engineer: { name: 'Engineer', description: 'Build a city wall for free', category: 'science' },
    inventor: { name: 'Inventor', description: 'Swap a number token', category: 'science' },
    irrigation: { name: 'Irrigation', description: 'Take 2 grain from the bank', category: 'science' },
    medicine: { name: 'Medicine', description: 'Choose a die roll number', category: 'science' },
    mining: { name: 'Mining', description: 'Take 2 ore from the bank', category: 'science' },
    printer: { name: 'Printer', description: 'Draw and keep 1 progress card from each deck', category: 'science' },
    road_building_progress: { name: 'Road Building', description: 'Build 2 roads for free', category: 'science' },
    smith: { name: 'Smith', description: 'Upgrade 2 knights for free', category: 'science' },

    // Trade cards (yellow)
    commercial_harbor: { name: 'Commercial Harbor', description: 'Special trade with bank at 2:1', category: 'trade' },
    master_merchant: { name: 'Master Merchant', description: 'Place or move the merchant', category: 'trade' },
    merchant: { name: 'Merchant', description: 'Take any 2 resources from the bank', category: 'trade' },
    merchant_fleet: { name: 'Merchant Fleet', description: 'Pick up to 2 trade offers to accept', category: 'trade' },
    resource_monopoly: { name: 'Resource Monopoly', description: 'All players must give you all of one resource type', category: 'trade' },
    trade_monopoly: { name: 'Trade Monopoly', description: 'All players must give you all of one commodity type', category: 'trade' },

    // Politics cards (blue)
    bishop: { name: 'Bishop', description: 'Move the robber and steal 1 card', category: 'politics' },
    constitution: { name: 'Constitution', description: 'Worth 1 victory point', category: 'politics' },
    deserter: { name: 'Deserter', description: 'Deactivate 1 of opponent\'s knights', category: 'politics' },
    diplomat: { name: 'Diplomat', description: 'Remove 1 opponent\'s road', category: 'politics' },
    intrigue: { name: 'Intrigue', description: 'Move 1 of your knights to opponent\'s road', category: 'politics' },
    saboteur: { name: 'Saboteur', description: 'Reduce opponent\'s city improvement by 1 level', category: 'politics' },
    spy: { name: 'Spy', description: 'Look at opponent\'s progress cards', category: 'politics' },
    warlord: { name: 'Warlord', description: 'Activate all your knights for free', category: 'politics' },
    wedding: { name: 'Wedding', description: 'Worth 1 victory point', category: 'politics' }
};

const CATEGORY_COLORS = {
    science: 'bg-green-600',
    trade: 'bg-yellow-600',
    politics: 'bg-blue-600'
};

const CATEGORY_ICONS = {
    science: '🟢',
    trade: '🟡',
    politics: '🔵'
};

export const ProgressCardHand: React.FC<ProgressCardHandProps> = ({ player, roomId, onPlayCard }) => {
    const [isPending, startTransition] = useTransition();
    const [expandedCard, setExpandedCard] = useState<ProgressCardType | null>(null);

    // Only show in C&K mode
    if (!player.progressCards) {
        return null;
    }

    const handlePlayCard = (cardType: ProgressCardType) => {
        startTransition(async () => {
            try {
                await onPlayCard(cardType);
                setExpandedCard(null);
            } catch (error) {
                console.error('Failed to play progress card:', error);
            }
        });
    };

    const groupedCards = player.progressCards.reduce((acc, card) => {
        const category = PROGRESS_CARD_INFO[card].category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(card);
        return acc;
    }, {} as Record<'science' | 'trade' | 'politics', ProgressCardType[]>);

    const totalCards = player.progressCards.length;

    if (totalCards === 0) {
        return (
            <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Progress Cards
                </h3>
                <div className="text-xs text-slate-400 text-center py-2">
                    No progress cards
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Progress Cards
                </h3>
                <div className="text-xs text-slate-400">
                    Total: <span className="text-white font-bold">{totalCards}</span>
                </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
                {(['science', 'trade', 'politics'] as const).map(category => {
                    const cards = groupedCards[category] || [];
                    if (cards.length === 0) return null;

                    return (
                        <div key={category} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{CATEGORY_ICONS[category]}</span>
                                <span className="uppercase tracking-wide">{category}</span>
                                <span>({cards.length})</span>
                            </div>
                            {cards.map((card, index) => {
                                const info = PROGRESS_CARD_INFO[card];
                                const isExpanded = expandedCard === card;

                                return (
                                    <div
                                        key={`${card}-${index}`}
                                        className={`p-2 rounded border transition-colors ${
                                            isExpanded
                                                ? 'border-yellow-500 bg-slate-700'
                                                : 'border-slate-600 bg-slate-900/50'
                                        }`}
                                    >
                                        <button
                                            onClick={() => setExpandedCard(isExpanded ? null : card)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{info.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[category]} text-white`}>
                                                    {CATEGORY_ICONS[category]}
                                                </span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {info.description}
                                                </p>
                                                <button
                                                    onClick={() => handlePlayCard(card)}
                                                    disabled={isPending}
                                                    className="w-full text-xs py-1.5 px-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:bg-slate-700 disabled:text-slate-500"
                                                >
                                                    {isPending ? 'Playing...' : 'Play Card'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
