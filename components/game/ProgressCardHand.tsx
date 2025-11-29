import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { PlayerState, GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardModal } from './ProgressCardModal';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { ProgressCardCategory } from '@/core/rules/commodity-constants';
import { getEligibleCityWallVertices } from '@/core/utils/city-wall-utils';
import { getUpgradeableSettlementVertices } from '@/core/utils/city-upgrade-utils';
import { getPromotableKnights } from '@/core/utils/knight-upgrade-utils';

interface ProgressCardHandProps {
    player: PlayerState;
    roomId: string;
    gameState: GameState;
    onPlayCard: (cardType: ProgressCardType, options?: any) => Promise<void>;
    onStartHexSelection?: (cardType: 'merchant' | 'inventor') => void;
    onStartVertexSelection?: (cardType: 'intrigue') => void;
    onStartEdgeSelection?: (cardType: 'diplomat') => void;
    onStartCrane?: () => void;
    onStartEngineerSelection?: () => void;
    onStartSmithSelection?: () => void;
    onStartMedicineSelection?: () => void;
    isActiveTurn?: boolean;
    isEngineerSelecting?: boolean;
    isSmithSelecting?: boolean;
    isMedicineSelecting?: boolean;
    activeFollowupCard?: ProgressCardType | null;
    onCancelFollowupCard?: () => void;
    decorateCardHandler?: <TArgs extends any[], TResult>(
        cardType: ProgressCardType,
        hasFollowupStep: boolean,
        handler: (...args: TArgs) => TResult
    ) => (...args: TArgs) => TResult;
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

const MEDICINE_COST = { ore: 2, wheat: 1 } as const;

// Cards that require parameter selection
const CARDS_REQUIRING_PARAMETERS: ProgressCardType[] = [
    'alchemist',
    'resource_monopoly',
    'trade_monopoly',
    'espionage',
    'treason',
    'saboteur'
];

const BOARD_SELECTION_CARDS: ProgressCardType[] = ['merchant', 'inventor', 'intrigue', 'diplomat'];
const CONFIRMATION_MODAL_CARDS: ProgressCardType[] = ['irrigation', 'mining'];
const ROAD_PLACEMENT_CARDS: ProgressCardType[] = ['road_building_progress'];

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
    onStartEdgeSelection,
    onStartCrane,
    onStartEngineerSelection,
    onStartSmithSelection,
    onStartMedicineSelection,
    isActiveTurn,
    isEngineerSelecting,
    isSmithSelecting,
    isMedicineSelecting,
    activeFollowupCard,
    onCancelFollowupCard,
    decorateCardHandler
}) => {
    const [isPending, startTransition] = useTransition();
    const [manualFollowupCard, setManualFollowupCard] = useState<ProgressCardType | null>(null);
    const [modalCard, setModalCard] = useState<ProgressCardType | null>(null);
    const currentActiveFollowup = modalCard ?? activeFollowupCard ?? manualFollowupCard ?? null;

    // Only show in C&K mode
    if (!player.progressCards) {
        return null;
    }

    const handlePlayCard = (cardType: ProgressCardType) => {
        const isBoardSelectionCard = BOARD_SELECTION_CARDS.includes(cardType);
        const isConfirmationModalCard = CONFIRMATION_MODAL_CARDS.includes(cardType);
        const isRoadPlacementCard = ROAD_PLACEMENT_CARDS.includes(cardType);
        const hasFollowupStep =
            isBoardSelectionCard ||
            isConfirmationModalCard ||
            isRoadPlacementCard ||
            requiresParameters(cardType) ||
            cardType === 'crane' ||
            cardType === 'engineer' ||
            cardType === 'smith' ||
            cardType === 'medicine';

        if (hasFollowupStep && currentActiveFollowup === cardType) {
            if (modalCard === cardType) {
                setModalCard(null);
            }
            setManualFollowupCard(null);
            onCancelFollowupCard?.();
            return;
        }

        if (hasFollowupStep && currentActiveFollowup && currentActiveFollowup !== cardType) {
            onCancelFollowupCard?.();
        } else if (!hasFollowupStep && currentActiveFollowup) {
            onCancelFollowupCard?.();
        }

        if (cardType === 'crane' && onStartCrane) {
            onStartCrane();
            return;
        }

        if (cardType === 'engineer' && onStartEngineerSelection) {
            onStartEngineerSelection();
            return;
        }

        if (cardType === 'smith' && onStartSmithSelection) {
            onStartSmithSelection();
            return;
        }

        if (cardType === 'medicine' && onStartMedicineSelection) {
            onStartMedicineSelection();
            return;
        }

        // Check for board selection cards first
        if (onStartHexSelection && (cardType === 'merchant' || cardType === 'inventor')) {
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

        if (isRoadPlacementCard) {
            setManualFollowupCard(cardType);
            (async () => {
                try {
                    await onPlayCard(cardType);
                } catch (e) {
                    console.error('Failed to play card', e);
                    setManualFollowupCard(null);
                }
            })();
            return;
        }

        // Check if card requires parameters
        if (isConfirmationModalCard || requiresParameters(cardType)) {
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

    // Clear local follow-up highlight when the server-driven active card clears
    useEffect(() => {
        if (!activeFollowupCard) {
            setManualFollowupCard(null);
        }
    }, [activeFollowupCard]);

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
    const engineerTargets = getEligibleCityWallVertices(gameState, player.id, { ignoreCost: true });
    const hasEngineerTarget = engineerTargets.length > 0;
    const smithTargets = getPromotableKnights(gameState, player.id);
    const hasSmithTarget = smithTargets.length > 0;
    const medicineTargets = getUpgradeableSettlementVertices(gameState, player.id);
    const hasMedicineTarget = medicineTargets.length > 0 && (player.citiesRemaining ?? 0) > 0;
    const canAffordMedicine =
        (player.resources.ore ?? 0) >= MEDICINE_COST.ore &&
        (player.resources.wheat ?? 0) >= MEDICINE_COST.wheat;
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

                {isActiveTurn && cardCount > 4 && (
                    <div className="relative z-10 px-4 py-2 bg-amber-900/50 border-b border-amber-600 text-xs text-amber-100">
                        <span className="font-semibold">Hand limit is 4 at end of your turn.</span>
                    </div>
                )}

                {/* Card List */}
                <div className="relative z-10 max-h-64 overflow-y-auto">
                    {isEmpty ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No progress cards</div>
                    ) : (
                        <div className="flex flex-col">
                            {allCards.map((cardType, index) => {
                                const info = PROGRESS_CARD_INFO[cardType];
                                const icon = CATEGORY_ICONS[info.category];

                                const isEngineer = cardType === 'engineer';
                                const isSmith = cardType === 'smith';
                                const isMedicine = cardType === 'medicine';
                                const engineerDisabled = isEngineer && !hasEngineerTarget;
                                const smithDisabled = isSmith && !hasSmithTarget;
                                const medicineDisabled = isMedicine && (!canAffordMedicine || !hasMedicineTarget);
                                const hasFollowup =
                                    requiresParameters(cardType) ||
                                    BOARD_SELECTION_CARDS.includes(cardType) ||
                                    ROAD_PLACEMENT_CARDS.includes(cardType) ||
                                    isEngineer ||
                                    isSmith ||
                                    isMedicine ||
                                    cardType === 'crane';
                                const isFollowupActive =
                                    hasFollowup && (
                                        currentActiveFollowup === cardType ||
                                        (isEngineer && isEngineerSelecting) ||
                                        (isSmith && isSmithSelecting) ||
                                        (isMedicine && isMedicineSelecting)
                                    );
                                const disabledTitle = isEngineer && engineerDisabled
                                    ? 'No cities without walls are available for Engineering'
                                    : isSmith && smithDisabled
                                        ? 'No knights can be promoted'
                                    : isMedicine && medicineDisabled
                                        ? 'Need 2 ore + 1 wheat, a city piece, and an upgradeable settlement for Medicine'
                                        : info.description;
                                const onCardClick = decorateCardHandler
                                    ? decorateCardHandler(cardType, hasFollowup, () => handlePlayCard(cardType))
                                    : () => handlePlayCard(cardType);
                                return (
                                    <button
                                        key={`${cardType}-${index}`}
                                        onClick={onCardClick}
                                        disabled={isPending || engineerDisabled || smithDisabled || medicineDisabled}
                                        className={`relative group w-full text-left px-4 py-3 transition-colors border-b border-slate-700/50 last:border-b-0 ${isFollowupActive
                                            ? 'bg-blue-700/60 text-white ring-2 ring-blue-400'
                                            : 'hover:bg-slate-700/50'
                                            } ${engineerDisabled || smithDisabled || medicineDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        title={disabledTitle}
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
