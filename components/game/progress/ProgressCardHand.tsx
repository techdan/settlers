import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { PlayerState, GameState } from '@/lib/types';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressCardModal } from './ProgressCardModal';
import { CommercialHarborInitiatorDialog } from './CommercialHarborInitiatorDialog';
import { getEligibleCityWallVertices } from '@/core/utils/city-wall-utils';
import { getUpgradeableSettlementVertices } from '@/core/utils/city-upgrade-utils';
import { getPromotableKnights } from '@/core/utils/knight-upgrade-utils';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { ProgressHandView, ProgressHandCard } from '@/components/game/player/ProgressHandView';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';

interface ProgressCardHandProps {
    player: PlayerState;
    roomId: string;
    gameState: GameState;
    onPlayCard: (cardType: ProgressCardType, options?: any) => Promise<void>;
    onStartHexSelection?: (cardType: 'merchant' | 'inventor' | 'taxation') => void;
    onStartVertexSelection?: (cardType: 'intrigue') => void;
    onStartEdgeSelection?: (cardType: 'diplomat') => void;
    onStartCrane?: () => void;
    onStartEngineerSelection?: () => void;
    onStartSmithSelection?: () => void;
    onStartMedicineSelection?: () => void;
    onStartTreasonSelection?: () => void;
    isActiveTurn?: boolean;
    isEngineerSelecting?: boolean;
    isSmithSelecting?: boolean;
    isMedicineSelecting?: boolean;
    onCancelFollowupCard?: () => void;
    /**
     * Reports which card's panel is open (null when none). Board-visible panels
     * (Alchemy et al.) no longer have a scrim to block the tray, so the tray
     * needs this to gate Roll/End Turn — otherwise a stray Roll click during
     * `waiting_for_roll` would burn the Alchemy card.
     */
    onOpenPanelChange?: (cardType: ProgressCardType | null) => void;
    decorateCardHandler?: <TArgs extends any[], TResult>(
        cardType: ProgressCardType,
        hasFollowupStep: boolean,
        handler: (...args: TArgs) => TResult
    ) => (...args: TArgs) => TResult;
}

const MEDICINE_COST = { ore: 2, wheat: 1 } as const;

/**
 * Turn a rejected card play into something a player can act on.
 *
 * Server actions rethrow service errors, and Next redacts those messages in
 * production builds — so `e.message` is the real validation text in dev but a
 * boilerplate "specific message is omitted" blurb in prod. Showing that blurb
 * would be worse than showing nothing, so it is swapped for a plain sentence.
 * (Repo-wide fix is tracked as §5.14 in the improvement plan: return typed
 * results from the action layer instead of throwing.)
 */
function describePlayFailure(error: unknown, cardType: ProgressCardType): string {
    const cardName = PROGRESS_CARD_DEFINITIONS[cardType]?.name ?? 'that card';
    const raw = error instanceof Error ? error.message.trim() : '';
    const isRedacted = !raw || /omitted in production|digest property|server components render/i.test(raw);

    return isRedacted ? `${cardName} could not be played right now.` : raw;
}

// Cards that require parameter selection
const CARDS_REQUIRING_PARAMETERS: ProgressCardType[] = [
    'alchemist',
    'guild_dues',
    'merchant_fleet',
    'resource_monopoly',
    'trade_monopoly',
    'espionage'
];

const BOARD_SELECTION_CARDS: ProgressCardType[] = ['merchant', 'inventor', 'intrigue', 'diplomat', 'taxation'];
const CONFIRMATION_MODAL_CARDS: ProgressCardType[] = ['irrigation', 'mining', 'encouragement', 'wedding', 'saboteur'];
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
    onStartTreasonSelection,
    isActiveTurn,
    isEngineerSelecting,
    isSmithSelecting,
    isMedicineSelecting,
    onCancelFollowupCard,
    onOpenPanelChange,
    decorateCardHandler
}) => {
    const [isPending, startTransition] = useTransition();
    const [manualFollowupCard, setManualFollowupCard] = useState<ProgressCardType | null>(null);
    const [modalCard, setModalCard] = useState<ProgressCardType | null>(null);
    // Server rejections used to reach console.error only, so an unplayable card
    // simply did nothing when clicked. The hand is gated for the reasons it can
    // see locally, but the server stays authoritative — anything it refuses
    // (stale state, a race with another player) has to be visible here.
    const [playError, setPlayError] = useState<string | null>(null);

    // Check timer status
    const timerStatus = useTimerState(gameState);

    // A panel must not outlive your turn. Board-visible panels have no scrim, so
    // once the timer locks, an open one would both cover the "Time is up!"
    // banner and leave its Play button live. Derived rather than cleared in an
    // effect so there is no render cascade — and so the panel comes back with
    // your selections intact if you buy time from your bank.
    const committedAlchemy =
        gameState.pendingAlchemy?.playerId === player.id ? 'alchemist' as const : null;
    const openPanelCard = timerStatus.isLocked ? null : (committedAlchemy ?? modalCard);
    const currentActiveFollowup = openPanelCard ?? manualFollowupCard ?? null;

    // Keep the tray in sync with the open card panel (see onOpenPanelChange).
    useEffect(() => {
        onOpenPanelChange?.(openPanelCard);
    }, [openPanelCard, onOpenPanelChange]);

    // Only show in C&K mode. This guard must stay BELOW every hook — it used to
    // sit above them, which meant a player gaining progressCards mid-session
    // would change the hook count between renders and throw.
    if (!player.progressCards) {
        return null;
    }

    const handlePlayCard = (cardType: ProgressCardType) => {
        setPlayError(null);
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

        if (cardType === 'treason' && onStartTreasonSelection) {
            onStartTreasonSelection();
            return;
        }

        // Check for board selection cards first
        if (onStartHexSelection && (cardType === 'merchant' || cardType === 'inventor' || cardType === 'taxation')) {
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

        // Commercial Harbor opens modal without playing card yet
        // Card will be played when offers are submitted
        if (cardType === 'commercial_harbor') {
            setModalCard(cardType);
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
                    setPlayError(describePlayFailure(e, cardType));
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
                    setPlayError(describePlayFailure(e, cardType));
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
    const engineerTargets = getEligibleCityWallVertices(gameState, player.id, { ignoreCost: true });
    const hasEngineerTarget = engineerTargets.length > 0;
    const smithTargets = getPromotableKnights(gameState, player.id);
    const hasSmithTarget = smithTargets.length > 0;
    const medicineTargets = getUpgradeableSettlementVertices(gameState, player.id);
    const hasMedicineTarget = medicineTargets.length > 0 && (player.citiesRemaining ?? 0) > 0;
    const canAffordMedicine =
        (player.resources.ore ?? 0) >= MEDICINE_COST.ore &&
        (player.resources.wheat ?? 0) >= MEDICINE_COST.wheat;

    // Route a click through the same decorator + play-routing path as before.
    // decorateCardHandler must receive the render-loop notion of "has follow-up"
    // (which includes treason) so its selection tracking is unchanged.
    const handleCardClick = (cardType: ProgressCardType) => {
        const hasFollowup =
            requiresParameters(cardType) ||
            BOARD_SELECTION_CARDS.includes(cardType) ||
            ROAD_PLACEMENT_CARDS.includes(cardType) ||
            cardType === 'engineer' ||
            cardType === 'smith' ||
            cardType === 'medicine' ||
            cardType === 'treason' ||
            cardType === 'crane';
        const run = decorateCardHandler
            ? decorateCardHandler(cardType, hasFollowup, () => handlePlayCard(cardType))
            : () => handlePlayCard(cardType);
        run();
    };

    // Build the presentational hand: one entry per held card (duplicates preserved),
    // with playability + follow-up state derived from the exact same gating as before.
    const handCards: ProgressHandCard[] = allCards.map((cardType) => {
        const isEngineer = cardType === 'engineer';
        const isSmith = cardType === 'smith';
        const isMedicine = cardType === 'medicine';
        const isAlchemist = cardType === 'alchemist';
        const isCommercialHarbor = cardType === 'commercial_harbor';
        const isTreason = cardType === 'treason';
        const isTaxation = cardType === 'taxation';
        const isIntrigue = cardType === 'intrigue';

        // Phase validation
        const wrongPhase = isAlchemist
            ? gameState.phase !== 'waiting_for_roll'
            : gameState.phase !== 'main_phase';
        const notPlayerTurn = !isActiveTurn;
        const phaseDisabled = notPlayerTurn || wrongPhase;

        const engineerDisabled = isEngineer && !hasEngineerTarget;
        const smithDisabled = isSmith && !hasSmithTarget;
        const medicineDisabled = isMedicine && (!canAffordMedicine || !hasMedicineTarget);

        // Disable Commercial Harbor if there's already an active session
        const commercialHarborDisabled = isCommercialHarbor &&
            gameState.pendingCommercialHarbor !== undefined &&
            gameState.pendingCommercialHarbor.offers.length > 0;

        // C&K Rule: Robber-related cards cannot be played before first barbarian attack
        const beforeFirstAttack = gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked;
        const robberCardDisabled = (isTaxation || isIntrigue || isTreason) && beforeFirstAttack;

        const disabled =
            isPending ||
            timerStatus.isLocked ||
            phaseDisabled ||
            engineerDisabled ||
            smithDisabled ||
            medicineDisabled ||
            commercialHarborDisabled ||
            robberCardDisabled;

        // Single short reason, highest priority first (mirrors the old tooltip order)
        let disabledReason: string | undefined;
        if (timerStatus.isLocked) {
            disabledReason = 'Time expired';
        } else if (notPlayerTurn) {
            disabledReason = 'You can only play cards on your turn';
        } else if (wrongPhase) {
            disabledReason = isAlchemist
                ? 'Can only be played before rolling dice'
                : 'Can only be played after rolling dice';
        } else if (engineerDisabled) {
            disabledReason = 'No cities without walls available';
        } else if (smithDisabled) {
            disabledReason = 'No knights can be promoted';
        } else if (medicineDisabled) {
            disabledReason = 'Need 2 ore + 1 wheat, a city piece, and an upgradeable settlement';
        } else if (commercialHarborDisabled) {
            disabledReason = 'Commercial Harbor already in progress';
        } else if (robberCardDisabled) {
            disabledReason = 'Cannot be played before the first barbarian attack';
        }

        const hasFollowup =
            requiresParameters(cardType) ||
            BOARD_SELECTION_CARDS.includes(cardType) ||
            ROAD_PLACEMENT_CARDS.includes(cardType) ||
            isEngineer ||
            isSmith ||
            isMedicine ||
            isTreason ||
            cardType === 'crane';
        const active =
            hasFollowup && (
                currentActiveFollowup === cardType ||
                (isEngineer && isEngineerSelecting) ||
                (isSmith && isSmithSelecting) ||
                (isMedicine && isMedicineSelecting)
            );

        return { type: cardType, disabled, disabledReason, active };
    });

    return (
        <>
            <div className="pointer-events-auto">
                {isActiveTurn && cardCount > 4 && (
                    <div className="mb-1.5 rounded-md px-3 py-1.5 bg-amber-900/50 border border-amber-600 text-xs text-amber-100 font-semibold">
                        Hand limit is 4 at end of your turn.
                    </div>
                )}
                {playError && (
                    <div
                        role="alert"
                        className="mb-1.5 flex items-start gap-2 rounded-md border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_14%,var(--ui-panel-solid))] px-3 py-1.5"
                    >
                        <TabletopStatusIcon type="cancel" size={14} className="mt-0.5 shrink-0" />
                        <span className="text-xs font-semibold text-[var(--ui-text)]">{playError}</span>
                        <button
                            type="button"
                            onClick={() => setPlayError(null)}
                            aria-label="Dismiss error"
                            className="ml-auto shrink-0 cursor-pointer text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted)] hover:text-[var(--ui-text)]"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
                <ProgressHandView cards={handCards} onCardClick={handleCardClick} />
            </div>

            {openPanelCard && typeof window !== 'undefined' && createPortal(
                openPanelCard === 'commercial_harbor' ? (
                    <CommercialHarborInitiatorDialog
                        gameState={gameState}
                        playerId={player.id}
                        roomId={roomId}
                        onClose={() => setModalCard(null)}
                    />
                ) : (
                    <ProgressCardModal
                        cardType={openPanelCard}
                        isOpen
                        onClose={() => setModalCard(null)}
                        onPlay={async (cardType, options) => {
                            // Rethrow so the modal keeps its own in-flight/error
                            // handling, but surface it in the hand too — the
                            // modal closes on some paths and the message would
                            // vanish with it.
                            try {
                                await onPlayCard(cardType, options);
                            } catch (e) {
                                setPlayError(describePlayFailure(e, cardType));
                                throw e;
                            }
                        }}
                        gameState={gameState}
                        currentPlayer={player}
                    />
                ),
                document.body
            )}
        </>
    );
};
