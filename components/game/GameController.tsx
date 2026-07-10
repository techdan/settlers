'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { PlayerHand } from './player/PlayerHand';
import { GameLog } from './ui/GameLog';
import { PlayerDevCards } from './player/PlayerDevCards';
import { ProgressCardPrompts } from './progress/ProgressCardPrompts';
import { BarbarianCityPrompt } from './overlays/BarbarianCityPrompt';
import { KnightDisplacementOverlay } from './overlays/KnightDisplacementOverlay';
import { GameEventModals } from './modals/GameEventModals';
import { VPCardModal } from './progress/VPCardModal';

import { CompactGameStatus } from './ui/CompactGameStatus';
import { SidebarTabs } from './ui/SidebarTabs';
import { BuildControls } from './city/BuildControls';
import { ActionControls } from './ui/ActionControls';
import { DiceDisplay } from './ui/DiceDisplay';
import { DiscardModal } from './modals/DiscardModal';
import { TradeModal } from './trade/TradeModal';
import { TradeOfferDisplay } from './trade/TradeOfferDisplay';
import { TradeModals } from './trade/TradeModals';
import { BoardSelectionPrompt } from './overlays/BoardSelectionPrompt';
import { buildCity, buildCityWall, endTurn, loseCityToBarbarian, moveRobber, rollDice } from '@/app/actions';
import { AqueductModal } from './progress/AqueductModal';
import { CommercialHarborModal } from './progress/CommercialHarborModal';
import { CommercialHarborInitiatorDialog } from './progress/CommercialHarborInitiatorDialog';

// Cities & Knights components
import { CityManagementDialog } from './city/CityManagementDialog';
import { SettlementManagementDialog } from './city/SettlementManagementDialog';
import { KnightManagementDialog } from './city/KnightManagementDialog';
import { ProgressCardHand } from './progress/ProgressCardHand';
import { ProgressCardDiscardDialog } from './progress/ProgressCardDiscardDialog';
import { DebugPanel } from './ui/DebugPanel';
import { OptimisticGameStateProvider, useOptimisticGameState } from '@/lib/hooks/useOptimisticGameState';
import { useProgressCardSelectionDecorator } from '@/lib/hooks/useProgressCardSelectionDecorator';
import { useProgressCardUIState } from '@/lib/hooks/useProgressCardUIState';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';
import { useGameSubscription } from '@/lib/hooks/useGameSubscription';
import { ConnectionStatusIndicator } from './ui/ConnectionStatus';
import { useTreasonState } from '@/lib/hooks/useTreasonState';
import { GameBoardSection } from './overlays/GameBoardSection';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressPromptProvider, useProgressPrompt } from '@/lib/hooks/useProgressPrompt';
import { TreasonEffect } from '@/lib/types/game';
import { WeddingGiftModal } from './progress/WeddingGiftModal';
import { RobberVictimSelectionModal } from './overlays/RobberVictimSelectionModal';
import { RobberTheftNotification } from './overlays/RobberTheftNotification';
import { GameOverModal } from './modals/GameOverModal';
import { RobberModals } from './overlays/RobberModals';
import { GameLayoutPanels } from './ui/GameLayoutPanels';
import { GameOverOverlay } from './overlays/GameOverOverlay';
import { WaitingOverlay } from './modals/WaitingOverlay';

// Controllers and hooks
import { useSelectionManager } from '@/lib/hooks/useSelectionManager';
import { createKnightController, KnightController } from '@/lib/controllers/knight-controller';
import { createImprovementController, ImprovementController } from '@/lib/controllers/improvement-controller';
import { createProgressCardController, ProgressCardController } from '@/lib/controllers/progress-card-controller';
import { createTradeController, TradeController } from '@/lib/controllers/trade-controller';
import { useRobberInteractions } from '@/lib/hooks/useRobberInteractions';
import { useTurnActions } from '@/lib/hooks/useTurnActions';
import {
    useInitialGameState,
    useResolveStuckBarbarian,
    useSubscribedGameState,
    useTheftNotificationEffect,
    useTradeCompletionEffect,
    useProgressDiscardEnforcement,
    useTurnSubmissionReset,
    useVPCardModalEffect,
    useGameOverModalEffect,
    useSelectedCardAutoClear,
} from '@/lib/hooks/useGameControllerEffects';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    // Game state management
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [turnSubmitted, setTurnSubmitted] = useState(false);
    const [showGameOverModal, setShowGameOverModal] = useState(false);

    // Progress card discard modal
    const [showProgressCardDiscard, setShowProgressCardDiscard] = useState(false);
    const [progressDiscardContext, setProgressDiscardContext] = useState<'own_turn' | 'other_turn'>('own_turn');

    // VP and notification states
    const [vpCardModalType, setVpCardModalType] = useState<'printer' | 'constitution' | null>(null);
    const [lastVPAcknowledgedAt, setLastVPAcknowledgedAt] = useState<number | null>(null);
    const lastVPCardSeenRef = useRef<number>(0);
    const [showRobberMovePrompt, setShowRobberMovePrompt] = useState(false);

    // Robber victim selection (not in selectionManager)
    const {
        robberVictimSelectionOpen,
        robberHexId,
        robberPotentialVictims,
        handleRobberVictimRequest,
        handleRobberVictimSelected,
        handleRobberVictimCancel,
        resetRobberSelection,
    } = useRobberInteractions({ roomId, playerId });
    const [showTheftNotification, setShowTheftNotification] = useState(false);
    const lastTheftSeenRef = useRef<number>(0);
    const [showTradeCompletion, setShowTradeCompletion] = useState(false);
    const lastTradeSeenRef = useRef<number>(0);

    // Consolidated selection state management
    const selectionManager = useSelectionManager();

    const MEDICINE_COST = { ore: 2, wheat: 1 } as const;
    const {
        selectedCard: selectedProgressCard,
        decorateCardHandler,
        clearSelectedCard
    } = useProgressCardSelectionDecorator();
    const engineeringPrompt = useProgressPrompt('engineer', selectionManager.selectingCityForEngineer);
    const medicinePrompt = useProgressPrompt('medicine', selectionManager.selectingCityForMedicine);
    const merchantPrompt = useProgressPrompt('merchant', selectionManager.selectingHexForCard === 'merchant');
    const inventorPrompt = useProgressPrompt('inventor', selectionManager.selectingHexForCard === 'inventor');
    const taxationPrompt = useProgressPrompt('taxation', selectionManager.selectingHexForCard === 'taxation');
    const metropolisPrompt = useProgressPrompt('metropolis', !!selectionManager.selectingCityForMetropolis);

    const router = useRouter();
    const { getOptimisticState, applyOptimisticUpdate, clearOptimisticUpdate, hasOptimisticUpdates } = useOptimisticGameState();
    const connectionStatus = useConnectionStatus();

    // Debug mode: enabled by default in development or via NEXT_PUBLIC_DEBUG_MODE env var
    const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    // Derived state for active turn and game mode
    const gameState = baseGameState ? getOptimisticState(baseGameState) : null;
    const currentPlayer = gameState?.players.find(p => p.id === playerId);
    const isCitiesAndKnights = gameState?.gameMode === 'cities_and_knights';
    const isActiveTurn = gameState?.currentTurn === playerId;

    useEffect(() => {
        if (gameState?.phase === 'robber_placement' && isActiveTurn) {
            setShowRobberMovePrompt(true);
        } else {
            setShowRobberMovePrompt(false);
        }
    }, [gameState?.phase, isActiveTurn]);

    useGameOverModalEffect(gameState, setShowGameOverModal);

    // Treason effect state
    const treasonEffect = gameState?.activeEffects?.find(
        (effect: any): effect is TreasonEffect => effect?.type === 'treason'
    );
    const treasonInitiatorId = treasonEffect?.initiatorId;
    const isTreasonInitiator = treasonInitiatorId === playerId;
    const treasonTargetId = treasonEffect?.targetPlayerId;
    const isTreasonTarget = treasonTargetId === playerId;
    const treasonInitiatorName = treasonInitiatorId && gameState
        ? gameState.players.find(p => p.id === treasonInitiatorId)?.name ?? null
        : null;

    // Road building effect state
    const roadBuildingEffect = gameState?.activeEffects?.find(
        (effect: any) => effect?.type === 'road_building_progress' && effect.playerId === playerId
    );
    const isRoadBuildingProgressActive = !!roadBuildingEffect && !!isActiveTurn;

    // Road building prompt hook (with hide method for controller)
    const roadBuildingPromptBase = useProgressPrompt('road_building_progress', isRoadBuildingProgressActive);
    const roadBuildingPrompt = {
        ...roadBuildingPromptBase,
        hide: () => roadBuildingPromptBase.clear()
    };

    // Treason state reset function
    const resetTreasonLocalState = (keepModal = false) => {
        if (!keepModal) selectionManager.setIsTreasonModalOpen(false);
        selectionManager.setTreasonMode(null);
        selectionManager.setTreasonSelectedOpponentId(null);
        selectionManager.setTreasonSelectedKnightId(null);
        selectionManager.setTreasonSelectedPlacementVertexId(null);
        selectionManager.setTreasonError(null);
        selectionManager.setIsSubmittingTreason(false);
    };

    // Progress card controller (defines handlePlayProgressCard used by other controllers)
    const progressCardController = createProgressCardController({
        roomId,
        playerId,
        gameState,
        selectionManager,
        merchantPrompt,
        inventorPrompt,
        taxationPrompt,
        engineeringPrompt,
        medicinePrompt,
        roadBuildingPrompt,
        getOptimisticState,
        clearSelectedCard,
        isActiveTurn,
        treasonEffect,
        isTreasonTarget,
        resetTreasonLocalState,
        isRoadBuildingProgressActive,
        progressDiscardContext,
        setShowProgressCardDiscard,
        setProgressDiscardContext,
    });

    // Knight controller
    const knightController = createKnightController({
        roomId,
        playerId,
        gameState,
        selectionManager,
        getOptimisticState,
        handlePlayProgressCard: progressCardController.handlePlayProgressCard
    });

    // Improvement controller
    const improvementController = createImprovementController({
        roomId,
        playerId,
        gameState,
        selectionManager,
        metropolisPrompt,
        handlePlayProgressCard: progressCardController.handlePlayProgressCard
    });
    const tradeController = createTradeController({ roomId, playerId });
    const { handleCancelFollowupCard, handleDiscardProgressCards } = progressCardController;

    const {
        treasonOpponents,
        treasonEffectLevel,
        treasonSupplyAvailable,
        treasonHasLegalPlacement,
        treasonStatus,
        showTreasonPlacePrompt,
        showTreasonModal,
    } = useTreasonState({
        gameState,
        playerId,
        treasonEffect,
        isTreasonInitiator,
        isTreasonTarget,
        selectionManager,
        resetTreasonLocalState,
    });

    const handleDismissTheftNotification = () => {
        setShowTheftNotification(false);
    };

    const handleDismissTradeCompletion = () => {
        setShowTradeCompletion(false);
    };

    const handleRobberMoveStarted = () => {
        setShowRobberMovePrompt(false);
    };

    const handleCancelSelection = () => {
        // Clear all selection state managed by selectionManager
        selectionManager.clearAllSelections();

        // Clear robber victim selection (not in selectionManager)
        resetRobberSelection();

        // Handle treason special case
        if (!treasonEffect || selectionManager.treasonMode === 'select_opponent') {
            resetTreasonLocalState(false);
            const currentSelection = selectionManager.selectingVertexForCard;
            if (currentSelection === 'treason_remove' || currentSelection === 'treason_place') {
                selectionManager.setSelectingVertexForCard(null);
            }
        }

        // Clear selected progress card and prompts
        clearSelectedCard();
        engineeringPrompt.clear();
        merchantPrompt.clear();
        taxationPrompt.clear();
        metropolisPrompt.clear();
    };

    const handleOpenPlayerCityManagement = () => {
        handleCancelSelection();
        selectionManager.setIsPlayerCityManagementOpen(true);
    };

    const handleLoseCityToBarbarians = async (vertexId: string) => {
        try {
            await loseCityToBarbarian(roomId, playerId, vertexId);
        } catch (e) {
            console.error('Error losing city to barbarians:', e);
            throw e;
        }
    };

    useInitialGameState(roomId, setBaseGameState);
    useResolveStuckBarbarian(baseGameState, roomId);

    // Realtime subscription
    const subscribedGameState = useGameSubscription(roomId, baseGameState);

    // Update local state when subscription updates
    useSubscribedGameState(subscribedGameState, setBaseGameState);

    // Show forced modal when the current player draws a VP progress card (auto-plays immediately).
    useVPCardModalEffect(baseGameState, playerId, lastVPCardSeenRef, setVpCardModalType);

    // Show theft notification when the robber steals from or for the current player
    useTheftNotificationEffect(baseGameState, playerId, lastTheftSeenRef, setShowTheftNotification);
    useTradeCompletionEffect(baseGameState, playerId, lastTradeSeenRef, setShowTradeCompletion);

    useProgressDiscardEnforcement(
        baseGameState,
        playerId,
        getOptimisticState,
        showProgressCardDiscard,
        setShowProgressCardDiscard,
        progressDiscardContext,
        setProgressDiscardContext
    );

    useTurnSubmissionReset(gameState, playerId, setTurnSubmitted);

    useSelectedCardAutoClear(selectedProgressCard, selectionManager, clearSelectedCard);

    const {
        showDiplomatPrompt,
        diplomatPromptStatus,
        showIntriguePrompt,
        intriguePromptStatus,
        showEngineeringPrompt,
        engineeringPromptStatus,
        showMedicinePrompt,
        medicinePromptStatus,
        showRoadBuildingPrompt,
        roadBuildingPromptStatus,
        smithEligibleVertexIds,
        selectedMerchantHex,
        selectedMerchantResource,
        showMerchantModal,
        showInventorPrompt,
        inventorPromptStatus,
        showTaxationModal,
        taxationPromptStatus,
    } = useProgressCardUIState({
        gameState,
        selectionManager,
        playerId,
        merchantPrompt,
        inventorPrompt,
        taxationPrompt,
        engineeringPrompt,
        medicinePrompt,
        roadBuildingPrompt,
        isActiveTurn: !!isActiveTurn,
    });

    const { handleRollDiceClick, handleEndTurnClick } = useTurnActions({
        roomId,
        playerId,
        baseGameState,
        getOptimisticState,
        applyOptimisticUpdate,
        clearOptimisticUpdate,
        setTurnSubmitted,
        isCitiesAndKnights: !!isCitiesAndKnights,
        currentPlayer,
        setShowProgressCardDiscard,
        setProgressDiscardContext,
    });

    if (!gameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    const shouldShowGameOverModal = showGameOverModal && (gameState.phase === 'game_over' || !!gameState.winner);
    const shouldShowGameOverOverlay = gameState.phase === 'game_over' && !!gameState.winner;

    const activeProgressCard: ProgressCardType | 'metropolis' | null = (() => {
        if (showRoadBuildingPrompt) return 'road_building_progress';
        if (showEngineeringPrompt) return 'engineer';
        if (selectionManager.selectingHexForCard) return selectionManager.selectingHexForCard;
        if (selectionManager.selectingVertexForCard === 'intrigue') return 'intrigue';
        if (selectionManager.selectingVertexForCard === 'treason_remove' || selectionManager.selectingVertexForCard === 'treason_place') return 'treason';
        if (selectionManager.selectingEdgeForCard) return selectionManager.selectingEdgeForCard;
        if (selectionManager.selectingKnightsForSmith) return 'smith';
        if (selectionManager.selectingCityForMedicine) return 'medicine';
        if (selectionManager.selectingCityForEngineer) return 'engineer';
        if (selectionManager.selectingCityForMetropolis) return 'metropolis';
        if (selectionManager.isCraneDialogOpen) return 'crane';
        if (selectionManager.treasonMode) return 'treason';
        if (selectedProgressCard) return selectedProgressCard;
        return null;
    })();
    const promptBlocksUI =
        showRoadBuildingPrompt ||
        showEngineeringPrompt ||
        showDiplomatPrompt ||
        showIntriguePrompt ||
        selectionManager.treasonMode === 'select_knight' ||
        selectionManager.treasonMode === 'place_knight';
    const engineerSelectionActive = showEngineeringPrompt || selectionManager.selectingCityForEngineer;

    return (
        <div className="relative h-screen w-screen overflow-x-visible overflow-y-hidden">
            {/* Connection Status Indicator */}
            <ConnectionStatusIndicator
                status={connectionStatus.status}
                consecutiveFailures={connectionStatus.consecutiveFailures}
                lastError={connectionStatus.lastError}
            />

            {shouldShowGameOverModal && (
                <GameOverModal
                    gameState={gameState}
                    winnerId={gameState.winner}
                    isOpen={shouldShowGameOverModal}
                    onClose={() => setShowGameOverModal(false)}
                />
            )}

            {shouldShowGameOverOverlay && (
                <GameOverOverlay
                    gameState={gameState}
                    onShowBreakdown={() => {
                        setShowGameOverModal(true);
                    }}
                />
            )}

            {showRobberMovePrompt && (
                <BoardSelectionPrompt
                    title="Move the robber"
                    description="Select any land hex to place the robber so the game can continue."
                    status="Everyone is waiting for your move."
                />
            )}

            {selectionManager.selectingKnightsForSmith && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/90 border border-blue-500/60 rounded-lg px-4 py-3 shadow-lg pointer-events-auto">
                    <div className="text-sm text-white">
                        <div className="font-semibold">Smithing: promote up to 2 knights</div>
                        <div className="text-xs text-slate-300">Click your knights on the board to select them.</div>
                        <div className="text-xs text-slate-200 mt-1">Selected {selectionManager.selectedSmithKnightIds.length}/2</div>
                    </div>
                    {selectionManager.smithError && (
                        <div className="text-xs text-red-200 bg-red-900/50 border border-red-600 rounded px-3 py-2">
                            {selectionManager.smithError}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={handleCancelSelection}
                        >
                            Cancel
                        </button>
                        <button
                            className={`px-3 py-2 rounded-md font-semibold shadow transition-colors ${selectionManager.selectedSmithKnightIds.length === 0
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                }`}
                            disabled={selectionManager.selectedSmithKnightIds.length === 0}
                            onClick={knightController.handleConfirmSmithPromotions}
                        >
                            Promote
                        </button>
                    </div>
                </div>
            )}

            <GameBoardSection
                gameState={gameState}
                playerId={playerId}
                selectionManager={selectionManager}
                smithEligibleVertexIds={smithEligibleVertexIds}
                isRoadBuildingProgressActive={isRoadBuildingProgressActive}
                showRoadBuildingPrompt={showRoadBuildingPrompt}
                onCancelSelection={handleCancelSelection}
                onConfirmSmithPromotions={knightController.handleConfirmSmithPromotions}
                onLoseCityToBarbarians={handleLoseCityToBarbarians}
                onRobberVictimRequest={handleRobberVictimRequest}
                onRobberMoveStarted={handleRobberMoveStarted}
                progressCardController={progressCardController}
                improvementController={improvementController}
                knightController={knightController}
            />

            <ProgressCardPrompts
                gameState={gameState}
                selectionManager={selectionManager}
                progressCardController={progressCardController}
                onCancelSelection={handleCancelSelection}
                showIntriguePrompt={showIntriguePrompt}
                intriguePromptStatus={intriguePromptStatus}
                showTreasonPlacePrompt={showTreasonPlacePrompt}
                treasonStatus={treasonStatus}
                treasonOpponents={treasonOpponents}
                treasonInitiatorName={treasonInitiatorName}
                treasonSupplyAvailable={treasonSupplyAvailable}
                treasonHasLegalPlacement={treasonHasLegalPlacement}
                showTreasonModal={showTreasonModal}
                onResetTreason={() => resetTreasonLocalState()}
                showMerchantModal={showMerchantModal}
                merchantPromptStatus={merchantPrompt.status}
                selectedMerchantResource={selectedMerchantResource}
                showTaxationModal={showTaxationModal}
                taxationPromptStatus={taxationPromptStatus}
                showEngineeringPrompt={showEngineeringPrompt}
                engineeringPromptStatus={engineeringPromptStatus}
                showMedicinePrompt={showMedicinePrompt}
                medicinePromptStatus={medicinePromptStatus}
                showRoadBuildingPrompt={showRoadBuildingPrompt}
                roadBuildingPromptStatus={roadBuildingPromptStatus}
                roadBuildingEffect={roadBuildingEffect}
                showInventorPrompt={showInventorPrompt}
                inventorPromptStatus={inventorPromptStatus}
                showDiplomatPrompt={showDiplomatPrompt}
                diplomatPromptStatus={diplomatPromptStatus}
            />

            {vpCardModalType && (
                <VPCardModal
                    type={vpCardModalType}
                    onAcknowledge={() => {
                        setLastVPAcknowledgedAt(Date.now());
                        setVpCardModalType(null);
                    }}
                />
            )}

            <DiscardModal gameState={gameState} playerId={playerId} />

            <RobberModals
                gameState={gameState}
                playerId={playerId}
                isOpen={robberVictimSelectionOpen}
                potentialVictims={robberPotentialVictims}
                onSelectVictim={handleRobberVictimSelected}
                onCancelVictim={handleRobberVictimCancel}
                showTheftNotification={showTheftNotification}
                onDismissTheft={handleDismissTheftNotification}
            />

            {/* City Management Dialog (C&K) */}
            {selectionManager.selectedCityId && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    vertexId={selectionManager.selectedCityId}
                    onClose={() => selectionManager.setSelectedCityId(null)}
                    onUpgradeImprovement={improvementController.handleUpgradeImprovement}
                    onBuildWall={improvementController.handleBuildCityWall}
                />
            )}

            {selectionManager.isPlayerCityManagementOpen && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => selectionManager.setIsPlayerCityManagementOpen(false)}
                    onUpgradeImprovement={improvementController.handleUpgradeImprovement}
                    showCityWall={false}
                />
            )}

            {selectionManager.isCraneDialogOpen && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => selectionManager.setIsCraneDialogOpen(false)}
                    onCraneUpgrade={improvementController.handleCraneUpgrade}
                    variant="crane"
                />
            )}

            {/* Settlement Management Dialog */}
            {selectionManager.selectedSettlementId && (
                <SettlementManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    vertexId={selectionManager.selectedSettlementId}
                    onClose={() => selectionManager.setSelectedSettlementId(null)}
                    onUpgradeToCity={improvementController.handleUpgradeSettlementToCity}
                />
            )}

            {/* Knight Management Dialog (C&K) */}
            {selectionManager.selectedKnightId && (
                <KnightManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    knightId={selectionManager.selectedKnightId}
                    onClose={() => selectionManager.setSelectedKnightId(null)}
                    onActivate={knightController.handleActivateKnight}
                    onUpgrade={knightController.handleUpgradeKnight}
                    onMove={knightController.handleMoveKnight}
                    onChaseRobber={knightController.handleChaseAwayRobber}
                />
            )}

            {/* Metropolis Selection Prompt (C&K) - No cancel, must select a city */}
            {selectionManager.selectingCityForMetropolis && metropolisPrompt.isVisible && (
                <BoardSelectionPrompt
                    title={`${selectionManager.selectingCityForMetropolis === 'science' ? 'Science' : selectionManager.selectingCityForMetropolis === 'trade' ? 'Trade' : 'Politics'} Metropolis`}
                    description={`You must select one of your cities to upgrade to a ${selectionManager.selectingCityForMetropolis === 'science' ? 'Science' : selectionManager.selectingCityForMetropolis === 'trade' ? 'Trade' : 'Politics'} Metropolis.`}
                    status={metropolisPrompt.status || 'Select a city to upgrade to Metropolis.'}
                    onFinish={improvementController.handleConfirmMetropolisBuild}
                    finishLabel="Confirm"
                    finishDisabled={!selectionManager.selectedMetropolisCityId || selectionManager.isMetropolisSubmitting}
                />
            )}

            {/* Progress Card Discard Dialog (C&K) */}
            {isCitiesAndKnights && currentPlayer && currentPlayer.progressCards && currentPlayer.progressCards.length > 4 && showProgressCardDiscard && (
                <ProgressCardDiscardDialog
                    cards={currentPlayer.progressCards}
                    maxCards={4}
                    onDiscard={handleDiscardProgressCards}
                    onClose={() => {
                        setShowProgressCardDiscard(false);
                        setProgressDiscardContext('own_turn');
                    }}
                    turnContext={progressDiscardContext}
                />
            )}

            <GameEventModals
                gameState={gameState}
                playerId={playerId}
                roomId={roomId}
                showTrade={showTrade}
                onCloseTrade={() => setShowTrade(false)}
                tradeController={tradeController}
            />

            <BarbarianCityPrompt gameState={gameState} playerId={playerId} />

            <TradeOfferDisplay gameState={gameState} playerId={playerId} tradeController={tradeController} />

            <TradeModals
                gameState={gameState}
                playerId={playerId}
                tradeController={tradeController}
                showTradeCompletion={showTradeCompletion}
                onDismissTradeCompletion={handleDismissTradeCompletion}
            />

            <KnightDisplacementOverlay
                gameState={gameState}
                playerId={playerId}
                onRemoveDisplacedKnight={knightController.handleRemoveDisplacedKnight}
            />

            <WaitingOverlay gameState={gameState} currentPlayerId={playerId} />

            <GameLayoutPanels
                gameState={gameState}
                playerId={playerId}
                isCitiesAndKnights={!!isCitiesAndKnights}
                isDebugMode={isDebugMode}
                currentPlayer={currentPlayer}
                selectionManager={selectionManager}
                promptBlocksUI={promptBlocksUI}
                engineerSelectionActive={engineerSelectionActive}
                isActiveTurn={!!isActiveTurn}
                handleOpenPlayerCityManagement={handleOpenPlayerCityManagement}
                handleCancelFollowupCard={handleCancelFollowupCard}
                decorateCardHandler={decorateCardHandler}
                progressCardControllerHandlers={{
                    handlePlayProgressCard: progressCardController.handlePlayProgressCard,
                    handleStartHexSelection: progressCardController.handleStartHexSelection,
                    handleStartVertexSelection: progressCardController.handleStartVertexSelection,
                    handleStartEdgeSelection: progressCardController.handleStartEdgeSelection,
                    handleStartEngineerSelection: progressCardController.handleStartEngineerSelection,
                    handleStartMedicineSelection: progressCardController.handleStartMedicineSelection,
                    handleStartTreasonSelection: progressCardController.handleStartTreasonSelection,
                }}
                improvementControllerHandlers={{
                    handleStartCraneDialog: improvementController.handleStartCraneDialog,
                }}
                knightControllerHandlers={{
                    handleStartSmithSelection: knightController.handleStartSmithSelection,
                }}
                onRollDice={handleRollDiceClick}
                onEndTurn={handleEndTurnClick}
                onOpenTrade={() => setShowTrade(true)}
                turnSubmitted={turnSubmitted}
                hasOptimisticUpdates={hasOptimisticUpdates()}
            />
        </div>
    );
};

// Export wrapped with OptimisticGameStateProvider
export const GameController: React.FC<GameControllerProps> = (props) => {
    return (
        <OptimisticGameStateProvider>
            <ProgressPromptProvider>
                <GameControllerInner {...props} />
            </ProgressPromptProvider>
        </OptimisticGameStateProvider>
    );
};
