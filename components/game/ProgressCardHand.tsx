import React, { useState, useTransition } from 'react';
import { PlayerState, GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardModal } from './ProgressCardModal';

interface ProgressCardHandProps {
    player: PlayerState;
    roomId: string;
    gameState: GameState;
    onPlayCard: (cardType: ProgressCardType, options?: any) => Promise<void>;
    onStartHexSelection?: (cardType: 'merchant' | 'irrigation' | 'mining' | 'inventor') => void;
    onStartVertexSelection?: (cardType: 'intrigue' | 'diplomat') => void;
}

// Card descriptions for tooltip/display
const PROGRESS_CARD_INFO: Record<ProgressCardType, { name: string; description: string; category: 'science' | 'trade' | 'politics' }> = {
    // Science cards (green)
    alchemist: { name: 'Alchemist', description: 'Convert 2 resources of one type into 1 resource of any type', category: 'science' },
    crane: { name: 'Crane', description: 'Build up to 2 city walls during your turn', category: 'science' },
    engineer: { name: 'Engineer', description: 'Move 1 city wall to any other city', category: 'science' },
    inventor: { name: 'Inventor', description: 'Swap the number tokens of any 2 terrain hexes', category: 'science' },
    irrigation: { name: 'Irrigation', description: 'Receive resources from 1 field hex regardless of the roll', category: 'science' },
    medicine: { name: 'Medicine', description: 'Worth 1 victory point', category: 'science' },
    mining: { name: 'Mining', description: 'Receive resources from 1 mountain hex regardless of the roll', category: 'science' },
    printer: { name: 'Printer', description: 'Worth 1 victory point', category: 'science' },
    road_building_progress: { name: 'Road Building', description: 'Build 2 roads for free', category: 'science' },
    smith: { name: 'Smith', description: 'Upgrade 1 knight to the next level for free', category: 'science' },

    // Trade cards (yellow)
    commercial_harbor: { name: 'Commercial Harbor', description: 'Offer 1 resource to each player; each must give you 1 commodity if they have one', category: 'trade' },
    guild_dues: { name: 'Guild Dues', description: 'Choose a player with more VPs than you. Look at their hand and take any 2 cards', category: 'trade' },
    merchant: { name: 'Merchant', description: 'Place merchant on a hex adjacent to your settlement/city (2:1 trade + 1 VP)', category: 'trade' },
    merchant_fleet: { name: 'Merchant Fleet', description: 'Choose 1 resource or commodity. Trade it at 2:1 for the rest of this turn', category: 'trade' },
    resource_monopoly: { name: 'Resource Monopoly', description: 'Name a resource. Each player must give you up to 2 of that resource', category: 'trade' },
    trade_monopoly: { name: 'Trade Monopoly', description: 'Name a commodity. Each player must give you 1 of that commodity if they have it', category: 'trade' },

    // Politics cards (blue)
    taxation: { name: 'Taxation', description: 'Move the robber. Steal 1 random card from each player with a building on that hex', category: 'politics' },
    constitution: { name: 'Constitution', description: 'Worth 1 victory point', category: 'politics' },
    treason: { name: 'Treason', description: 'Choose a player; they remove a knight. You place a knight of equal or lower strength', category: 'politics' },
    diplomat: { name: 'Diplomat', description: 'Remove an open road. If it is yours, you may rebuild one road for free', category: 'politics' },
    intrigue: { name: 'Intrigue', description: 'Displace a knight on an intersection connected to one of your routes', category: 'politics' },
    saboteur: { name: 'Sabotage', description: 'Players with equal or more VPs discard half their resource/commodity cards', category: 'politics' },
    espionage: { name: 'Espionage', description: 'Look at another player\'s progress cards; take 1', category: 'politics' },
    encouragement: { name: 'Encouragement', description: 'Activate all your knights for free', category: 'politics' },
    wedding: { name: 'Wedding', description: 'Each player with more VPs than you must give you 2 cards of their choice', category: 'politics' }
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

// Cards that require parameter selection
const CARDS_REQUIRING_PARAMETERS: ProgressCardType[] = [
    'alchemist',
    'smith',
    'resource_monopoly',
    'trade_monopoly',
    'espionage',
    'treason',
    'saboteur'
];

function requiresParameters(cardType: ProgressCardType): boolean {
    return CARDS_REQUIRING_PARAMETERS.includes(cardType);
}

export const ProgressCardHand: React.FC<ProgressCardHandProps> = ({
    player,
    roomId,
    gameState,
    onPlayCard,
    onStartHexSelection,
    onStartVertexSelection
}) => {
    const [isPending, startTransition] = useTransition();
    const [modalCard, setModalCard] = useState<ProgressCardType | null>(null);

    // Only show in C&K mode
    if (!player.progressCards) {
        return null;
    }

    const handlePlayCard = (cardType: ProgressCardType) => {
        // Check for board selection cards first
        if (onStartHexSelection && (cardType === 'merchant' || cardType === 'irrigation' || cardType === 'mining' || cardType === 'inventor')) {
            onStartHexSelection(cardType);
            return;
        }

        if (onStartVertexSelection && (cardType === 'intrigue' || cardType === 'diplomat')) {
            onStartVertexSelection(cardType);
            return;
        }

        // Check if card requires parameters
        if (requiresParameters(cardType)) {
            setModalCard(cardType);
        } else {
            // Play card directly
            startTransition(async () => {
                try {
                    await onPlayCard(cardType);
                } catch (e) {
                    console.error('Failed to play card', e);
                }
            });
        }
    };

    // Collect all cards into a single list
    const allCards: ProgressCardType[] = [];

    // Handle both Array (new) and Record (legacy/mismatch) formats
    if (Array.isArray(player.progressCards)) {
        allCards.push(...player.progressCards);
    } else if (typeof player.progressCards === 'object' && player.progressCards !== null) {
        // Fallback for Record<string, number>
        Object.entries(player.progressCards).forEach(([type, count]) => {
            if (typeof count === 'number' && count > 0) {
                const cardType = type as ProgressCardType;
                for (let i = 0; i < count; i++) {
                    allCards.push(cardType);
                }
            }
        });
    }

    const cardCount = allCards.length;
    const isEmpty = cardCount === 0;

    return (
        <>
            <div className="bg-slate-800/90 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto w-80">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-2 border-b border-slate-700">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Progress Cards</h3>
                    <div className="text-xs text-slate-400">
                        <span className="text-white font-bold">{cardCount}</span>
                    </div>
                </div>

                {/* Card List */}
                <div className="max-h-64 overflow-y-auto">
                    {isEmpty ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No progress cards</div>
                    ) : (
                        <div className="flex flex-col">
                            {allCards.map((cardType, index) => {
                                const info = PROGRESS_CARD_INFO[cardType];
                                const icon = CATEGORY_ICONS[info.category];

                                return (
                                    <button
                                        key={`${cardType}-${index}`}
                                        onClick={() => handlePlayCard(cardType)}
                                        disabled={isPending}
                                        className="relative group w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors disabled:opacity-50 border-b border-slate-700/50 last:border-b-0"
                                        title={info.description}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{icon}</span>
                                            <span className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                {info.name}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {modalCard && (
                <ProgressCardModal
                    cardType={modalCard}
                    isOpen={!!modalCard}
                    onClose={() => setModalCard(null)}
                    onPlay={(options) => {
                        startTransition(async () => {
                            try {
                                await onPlayCard(modalCard, options);
                                setModalCard(null);
                            } catch (e) {
                                console.error('Failed to play card', e);
                            }
                        });
                    }}
                    gameState={gameState}
                    currentPlayer={player}
                />
            )}
        </>
    );
};
