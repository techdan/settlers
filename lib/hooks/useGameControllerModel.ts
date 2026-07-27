import { useState } from 'react';
import { loseCityToBarbarian } from '@/app/actions';
import { createImprovementController } from '@/lib/controllers/improvement-controller';
import { createKnightController } from '@/lib/controllers/knight-controller';
import { createProgressCardController } from '@/lib/controllers/progress-card-controller';
import { createTradeController } from '@/lib/controllers/trade-controller';
import type { GameState } from '@/lib/types';
import { isRoadBuildingEffect, isTreasonEffect } from '@/lib/types/effects';
import { useConnectionStatus } from './useConnectionStatus';
import {
    useInitialGameState,
    useResolveStuckBarbarian,
    useSelectedCardAutoClear,
    useSubscribedGameState,
} from './useGameControllerEffects';
import { useGameModalState } from './useGameModalState';
import { useGameNotifications } from './useGameNotifications';
import { useGameRobberState } from './useGameRobberState';
import { useGameSubscription } from './useGameSubscription';
import { useOptimisticGameState } from './useOptimisticGameState';
import { useProgressCardSelectionDecorator } from './useProgressCardSelectionDecorator';
import { useProgressCardUIState } from './useProgressCardUIState';
import { useProgressPrompt } from './useProgressPrompt';
import { useSelectionManager } from './useSelectionManager';
import { useTreasonState } from './useTreasonState';
import { useTurnActions } from './useTurnActions';

interface UseGameControllerModelParams {
    roomId: string;
    playerId: string;
}

export function useGameControllerModel({
    roomId,
    playerId,
}: UseGameControllerModelParams) {
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const optimisticState = useOptimisticGameState();
    const gameState = baseGameState
        ? optimisticState.getOptimisticState(baseGameState)
        : null;
    const currentPlayer = gameState?.players.find(player => player.id === playerId);
    const isCitiesAndKnights = gameState?.gameMode === 'cities_and_knights';
    const isActiveTurn = gameState?.currentTurn === playerId;

    const modalState = useGameModalState({
        baseGameState,
        gameState,
        playerId,
        getOptimisticState: optimisticState.getOptimisticState,
    });
    const notifications = useGameNotifications(baseGameState, playerId);
    const robber = useGameRobberState({
        gameState,
        roomId,
        playerId,
        onGameStateUpdated: setBaseGameState,
    });
    const selectionManager = useSelectionManager();
    const {
        selectedCard: selectedProgressCard,
        decorateCardHandler,
        clearSelectedCard,
    } = useProgressCardSelectionDecorator();

    const engineeringPrompt = useProgressPrompt(
        'engineer',
        selectionManager.selectingCityForEngineer
    );
    const medicinePrompt = useProgressPrompt(
        'medicine',
        selectionManager.selectingCityForMedicine
    );
    const merchantPrompt = useProgressPrompt(
        'merchant',
        selectionManager.selectingHexForCard === 'merchant'
    );
    const inventorPrompt = useProgressPrompt(
        'inventor',
        selectionManager.selectingHexForCard === 'inventor'
    );
    const taxationPrompt = useProgressPrompt(
        'taxation',
        selectionManager.selectingHexForCard === 'taxation'
    );
    const metropolisPrompt = useProgressPrompt(
        'metropolis',
        Boolean(selectionManager.selectingCityForMetropolis)
    );
    const connectionStatus = useConnectionStatus();
    const isDebugMode =
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    const treasonEffect = gameState?.activeEffects?.find(isTreasonEffect);
    const treasonInitiatorId = treasonEffect?.initiatorId;
    const isTreasonInitiator = treasonInitiatorId === playerId;
    const isTreasonTarget = treasonEffect?.targetPlayerId === playerId;
    const treasonInitiatorName = treasonInitiatorId && gameState
        ? gameState.players.find(player => player.id === treasonInitiatorId)?.name ?? null
        : null;
    const roadBuildingEffect = gameState?.activeEffects
        ?.filter(isRoadBuildingEffect)
        .find(effect => effect.playerId === playerId);
    const isRoadBuildingProgressActive =
        Boolean(roadBuildingEffect) && Boolean(isActiveTurn);
    const roadBuildingPromptBase = useProgressPrompt(
        'road_building_progress',
        isRoadBuildingProgressActive
    );
    const roadBuildingPrompt = {
        ...roadBuildingPromptBase,
        hide: () => roadBuildingPromptBase.clear(),
    };

    const resetTreasonLocalState = (keepModal = false) => {
        if (!keepModal) selectionManager.setIsTreasonModalOpen(false);
        selectionManager.setTreasonMode(null);
        selectionManager.setTreasonSelectedOpponentId(null);
        selectionManager.setTreasonSelectedKnightId(null);
        selectionManager.setTreasonSelectedPlacementVertexId(null);
        selectionManager.setTreasonError(null);
        selectionManager.setIsSubmittingTreason(false);
    };

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
        getOptimisticState: optimisticState.getOptimisticState,
        clearSelectedCard,
        isActiveTurn,
        isTreasonTarget,
        resetTreasonLocalState,
        isRoadBuildingProgressActive,
        progressDiscardContext: modalState.progressDiscardContext,
        setShowProgressCardDiscard: modalState.setShowProgressCardDiscard,
        setProgressDiscardContext: modalState.setProgressDiscardContext,
        onGameStateUpdated: setBaseGameState,
    });
    const knightController = createKnightController({
        roomId,
        playerId,
        gameState,
        selectionManager,
        getOptimisticState: optimisticState.getOptimisticState,
        handlePlayProgressCard: progressCardController.handlePlayProgressCard,
    });
    const improvementController = createImprovementController({
        roomId,
        playerId,
        gameState,
        selectionManager,
        metropolisPrompt,
        handlePlayProgressCard: progressCardController.handlePlayProgressCard,
    });
    const tradeController = createTradeController({ roomId, playerId });
    const treasonState = useTreasonState({
        gameState,
        playerId,
        treasonEffect,
        isTreasonInitiator,
        isTreasonTarget,
        selectionManager,
        resetTreasonLocalState,
    });

    const handleCancelSelection = () => {
        selectionManager.clearAllSelections();
        robber.resetRobberSelection();

        if (!treasonEffect || selectionManager.treasonMode === 'select_opponent') {
            resetTreasonLocalState(false);
            const currentSelection = selectionManager.selectingVertexForCard;
            if (
                currentSelection === 'treason_remove' ||
                currentSelection === 'treason_place'
            ) {
                selectionManager.setSelectingVertexForCard(null);
            }
        }

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
        } catch (error) {
            console.error('Error losing city to barbarians:', error);
            throw error;
        }
    };

    useInitialGameState(roomId, setBaseGameState);
    useResolveStuckBarbarian(baseGameState, roomId);
    const subscribedGameState = useGameSubscription(roomId, baseGameState);
    useSubscribedGameState(subscribedGameState, setBaseGameState);
    useSelectedCardAutoClear(
        selectedProgressCard,
        selectionManager,
        clearSelectedCard
    );

    const progressUI = useProgressCardUIState({
        gameState,
        selectionManager,
        playerId,
        merchantPrompt,
        inventorPrompt,
        taxationPrompt,
        engineeringPrompt,
        medicinePrompt,
        roadBuildingPrompt,
        isActiveTurn: Boolean(isActiveTurn),
    });
    const turnActions = useTurnActions({
        roomId,
        playerId,
        baseGameState,
        getOptimisticState: optimisticState.getOptimisticState,
        applyOptimisticUpdate: optimisticState.applyOptimisticUpdate,
        clearOptimisticUpdate: optimisticState.clearOptimisticUpdate,
        setTurnSubmitted: modalState.setTurnSubmitted,
        isCitiesAndKnights: Boolean(isCitiesAndKnights),
        currentPlayer,
        setShowProgressCardDiscard: modalState.setShowProgressCardDiscard,
        setProgressDiscardContext: modalState.setProgressDiscardContext,
    });

    return {
        gameState,
        currentPlayer,
        isCitiesAndKnights: Boolean(isCitiesAndKnights),
        isActiveTurn: Boolean(isActiveTurn),
        isDebugMode,
        connectionStatus,
        modalState,
        notifications,
        robber,
        selectionManager,
        decorateCardHandler,
        merchantPrompt,
        metropolisPrompt,
        roadBuildingEffect,
        isRoadBuildingProgressActive,
        progressCardController,
        knightController,
        improvementController,
        tradeController,
        treasonState,
        treasonInitiatorName,
        resetTreasonLocalState,
        handleCancelSelection,
        handleOpenPlayerCityManagement,
        handleLoseCityToBarbarians,
        setBaseGameState,
        progressUI,
        turnActions,
        hasOptimisticUpdates: optimisticState.hasOptimisticUpdates(),
    };
}
