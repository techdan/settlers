import React, { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { PlayerState, GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardModal } from './ProgressCardModal';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';

interface ProgressCardHandProps {
    player: PlayerState;
    roomId: string;
    gameState: GameState;
    onPlayCard: (cardType: ProgressCardType, options?: any) => Promise<void>;
    onStartHexSelection?: (cardType: 'merchant' | 'irrigation' | 'mining' | 'inventor') => void;
    onStartVertexSelection?: (cardType: 'intrigue') => void;
    onStartEdgeSelection?: (cardType: 'diplomat') => void;
}

// Build card info from the official definitions
const PROGRESS_CARD_INFO: Record<ProgressCardType, { name: string; description: string; category: ProgressCardCategory }> =
    Object.fromEntries(
        Object.entries(PROGRESS_CARD_DEFINITIONS).map(([type, meta]) => [
            type,
            { name: meta.name, description: meta.description, category: meta.category }
        ])
    ) as Record<ProgressCardType, { name: string; description: string; category: ProgressCardCategory }>;

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
    onStartVertexSelection,
    onStartEdgeSelection
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

        if (onStartVertexSelection && cardType === 'intrigue') {
            onStartVertexSelection(cardType);
            return;
        }

        if (onStartEdgeSelection && cardType === 'diplomat') {
            onStartEdgeSelection(cardType);
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
            <div className="relative rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto w-80 overflow-hidden">
                <div className="absolute inset-0 opacity-90 bg-slate-800"></div>
                <div className="absolute inset-0 opacity-20" style={{ backgroundColor: player.color }}></div>

                {/* Header */}
                <div className="relative z-10 flex justify-between items-center px-4 py-2 border-b border-slate-700">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Progress Cards</h3>
                    <div className="text-xs text-slate-400">
                        <span className="text-white font-bold">{cardCount}</span>
                    </div>
                </div>

                {/* Card List */}
                <div className="relative z-10 max-h-64 overflow-y-auto">
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

            {modalCard && typeof window !== 'undefined' && createPortal(
                <ProgressCardModal
                    cardType={modalCard}
                    isOpen={!!modalCard}
                    onClose={() => setModalCard(null)}
                    onPlay={async (cardType, options) => {
                        await onPlayCard(cardType, options);
                    }}
                    gameState={gameState}
                    currentPlayer={player}
                />,
                document.body
            )}
        </>
    );
};
