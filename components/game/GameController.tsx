'use client';

import React from 'react';
import { ProgressCardPrompts } from './progress/ProgressCardPrompts';
import { BarbarianCityPrompt } from './overlays/BarbarianCityPrompt';
import { KnightDisplacementOverlay } from './overlays/KnightDisplacementOverlay';
import { GameEventModals } from './modals/GameEventModals';
import { VPCardModal } from './progress/VPCardModal';
import { DiscardModal } from './modals/DiscardModal';
import { TradeOfferDisplay } from './trade/TradeOfferDisplay';
import { TradeModals } from './trade/TradeModals';
import { BoardSelectionPrompt } from './overlays/BoardSelectionPrompt';
import { CityManagementDialog } from './city/CityManagementDialog';
import { SettlementManagementDialog } from './city/SettlementManagementDialog';
import { KnightManagementDialog } from './city/KnightManagementDialog';
import { ProgressCardDiscardDialog } from './progress/ProgressCardDiscardDialog';
import { OptimisticGameStateProvider } from '@/lib/hooks/useOptimisticGameState';
import { ConnectionStatusIndicator } from './ui/ConnectionStatus';
import { GameBoardSection } from './board/GameBoardSection';
import { ProgressPromptProvider } from '@/lib/hooks/useProgressPrompt';
import { GameOverModal } from './modals/GameOverModal';
import { RobberModals } from './overlays/RobberModals';
import { GameLayoutPanels } from './ui/GameLayoutPanels';
import { GameTray } from './ui/GameTray';
import { GameOverOverlay } from './overlays/GameOverOverlay';
import { WaitingOverlay } from './modals/WaitingOverlay';
import { InventorSwapNotification } from './overlays/InventorSwapNotification';
import { useGameControllerModel } from '@/lib/hooks/useGameControllerModel';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const model = useGameControllerModel({ roomId, playerId });
    const {
        gameState, currentPlayer, isCitiesAndKnights, isActiveTurn, isDebugMode,
        connectionStatus, modalState, notifications, robber, selectionManager,
        decorateCardHandler, merchantPrompt, metropolisPrompt, roadBuildingEffect,
        isRoadBuildingProgressActive, progressCardController, knightController,
        improvementController, tradeController, treasonState, treasonInitiatorName,
        resetTreasonLocalState, handleCancelSelection,
        handleOpenPlayerCityManagement, handleLoseCityToBarbarians,
        setBaseGameState, progressUI, turnActions, hasOptimisticUpdates,
    } = model;
    const {
        showTrade, turnSubmitted, showGameOverModal,
        showProgressCardDiscard, progressDiscardContext,
    } = modalState;
    const {
        vpCardModalType, acknowledgeVPCard, theftNotification,
        dismissTheftNotification, showTradeCompletion, dismissTradeCompletion,
        inventorSwapNotification, dismissInventorSwapNotification,
    } = notifications;
    const {
        robberVictimSelectionOpen, robberPotentialVictims,
        handleRobberVictimRequest, handleRobberVictimSelected,
        handleRobberVictimCancel, showMovePrompt: showRobberMovePrompt,
        handleMoveStarted: handleRobberMoveStarted,
    } = robber;

    const { handleCancelFollowupCard, handleDiscardProgressCards } = progressCardController;
    const {
        treasonOpponents,
        treasonSupplyAvailable,
        treasonHasLegalPlacement,
        treasonStatus,
        showTreasonPlacePrompt,
        showTreasonModal,
    } = treasonState;

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
        selectedMerchantResource,
        showMerchantModal,
        showInventorPrompt,
        inventorPromptStatus,
        showTaxationModal,
        taxationPromptStatus,
    } = progressUI;
    const { handleRollDiceClick, handleEndTurnClick } = turnActions;

    if (!gameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    const shouldShowGameOverModal = showGameOverModal && (gameState.phase === 'game_over' || !!gameState.winner);
    const shouldShowGameOverOverlay = gameState.phase === 'game_over' && !!gameState.winner;

    const promptBlocksUI =
        showRoadBuildingPrompt ||
        showEngineeringPrompt ||
        showDiplomatPrompt ||
        showIntriguePrompt ||
        selectionManager.treasonMode === 'select_knight' ||
        selectionManager.treasonMode === 'place_knight';
    const engineerSelectionActive = showEngineeringPrompt || selectionManager.selectingCityForEngineer;

    return (
        <div className="relative h-[100dvh] w-screen overflow-hidden">
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
                    onClose={modalState.closeGameOverModal}
                />
            )}

            {shouldShowGameOverOverlay && (
                <GameOverOverlay
                    gameState={gameState}
                    onShowBreakdown={modalState.openGameOverModal}
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
                <div className="pointer-events-auto absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--ui-accent)] bg-[var(--ui-panel)] px-4 py-3 shadow-lg backdrop-blur-sm">
                    <div className="text-sm text-white">
                        <div className="font-semibold">Smithing: promote up to 2 knights</div>
                        <div className="text-xs text-[var(--ui-muted)]">Click your knights on the board to select them.</div>
                        <div className="mt-1 text-xs text-[var(--ui-text)]">Selected {selectionManager.selectedSmithKnightIds.length}/2</div>
                    </div>
                    {selectionManager.smithError && (
                        <div className="text-xs text-red-200 bg-red-900/50 border border-red-600 rounded px-3 py-2">
                            {selectionManager.smithError}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            className="cursor-pointer rounded-md border border-[var(--ui-border)] px-3 py-2 text-[var(--ui-text)] transition hover:bg-[var(--ui-panel-raised)]"
                            onClick={handleCancelSelection}
                        >
                            Cancel
                        </button>
                        <button
                            className={`px-3 py-2 rounded-md font-semibold shadow transition-colors ${selectionManager.selectedSmithKnightIds.length === 0
                                ? 'bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] cursor-not-allowed'
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
                onGameStateUpdated={setBaseGameState}
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
                    onAcknowledge={acknowledgeVPCard}
                />
            )}

            {inventorSwapNotification && (
                <InventorSwapNotification
                    event={inventorSwapNotification}
                    playerName={gameState.players.find(player => player.id === inventorSwapNotification.playerId)?.name ?? 'Another player'}
                    onDismiss={dismissInventorSwapNotification}
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
                theftNotification={theftNotification}
                onDismissTheft={dismissTheftNotification}
            />

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

            {selectionManager.selectedSettlementId && (
                <SettlementManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    vertexId={selectionManager.selectedSettlementId}
                    onClose={() => selectionManager.setSelectedSettlementId(null)}
                    onUpgradeToCity={improvementController.handleUpgradeSettlementToCity}
                />
            )}

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

            {isCitiesAndKnights && currentPlayer && currentPlayer.progressCards && currentPlayer.progressCards.length > 4 && showProgressCardDiscard && (
                <ProgressCardDiscardDialog
                    cards={currentPlayer.progressCards}
                    maxCards={4}
                    onDiscard={handleDiscardProgressCards}
                    onClose={modalState.closeProgressCardDiscard}
                    turnContext={progressDiscardContext}
                />
            )}

            <GameEventModals
                gameState={gameState}
                playerId={playerId}
                roomId={roomId}
                showTrade={showTrade}
                onCloseTrade={modalState.closeTrade}
                tradeController={tradeController}
            />

            <BarbarianCityPrompt gameState={gameState} playerId={playerId} />

            <TradeOfferDisplay gameState={gameState} playerId={playerId} tradeController={tradeController} />

            <TradeModals
                gameState={gameState}
                playerId={playerId}
                tradeController={tradeController}
                showTradeCompletion={showTradeCompletion}
                onDismissTradeCompletion={dismissTradeCompletion}
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
                isDebugMode={isDebugMode}
                onOpenPlayerCityManagement={handleOpenPlayerCityManagement}
                tray={(
                    <GameTray
                        gameState={gameState}
                        playerId={playerId}
                        isCitiesAndKnights={!!isCitiesAndKnights}
                        currentPlayer={currentPlayer}
                        selectionManager={selectionManager}
                        promptBlocksUI={promptBlocksUI}
                        engineerSelectionActive={engineerSelectionActive}
                        isActiveTurn={!!isActiveTurn}
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
                        onOpenTrade={modalState.openTrade}
                        turnSubmitted={turnSubmitted}
                        hasOptimisticUpdates={hasOptimisticUpdates}
                    />
                )}
            />
        </div>
    );
};

export const GameController: React.FC<GameControllerProps> = (props) => {
    return (
        <OptimisticGameStateProvider>
            <ProgressPromptProvider>
                <GameControllerInner {...props} />
            </ProgressPromptProvider>
        </OptimisticGameStateProvider>
    );
};
