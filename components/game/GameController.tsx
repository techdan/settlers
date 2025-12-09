'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Board } from '@/components/board/Board';
import { BoardSelectionState, BoardCallbacks } from '@/lib/types/board-selection-state';
import { GameState } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { PlayerHand } from './PlayerHand';
import { GameLog } from './GameLog';
import { PlayerDevCards } from './PlayerDevCards';

import { CompactGameStatus } from './CompactGameStatus';
import { SidebarTabs } from './SidebarTabs';
import { BuildControls } from './BuildControls';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { DiscardModal } from './DiscardModal';
import { TradeModal } from './TradeModal';
import { TradeOfferDisplay } from './TradeOfferDisplay';
import { BoardSelectionPrompt } from './BoardSelectionPrompt';
import { buildCity, buildCityWall, endTurn, moveRobber } from '@/app/actions';
import { AqueductModal } from './AqueductModal';
import { CommercialHarborModal } from './CommercialHarborModal';
import { CommercialHarborInitiatorDialog } from './CommercialHarborInitiatorDialog';

// Cities & Knights components
import { CityManagementDialog } from './CityManagementDialog';
import { SettlementManagementDialog } from './SettlementManagementDialog';
import { KnightManagementDialog } from './KnightManagementDialog';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';

import { ProgressCardHand } from './ProgressCardHand';
import { ProgressCardDiscardDialog } from './ProgressCardDiscardDialog';
import { DebugPanel } from './DebugPanel';
import { OptimisticGameStateProvider, useOptimisticGameState } from '@/lib/hooks/useOptimisticGameState';
import { useProgressCardSelectionDecorator } from '@/lib/hooks/useProgressCardSelectionDecorator';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';
import { useGameSubscription } from '@/lib/hooks/useGameSubscription';
import { ConnectionStatusIndicator } from './ConnectionStatus';
import { getEligibleCityWallVertices } from '@/core/utils/city-wall-utils';
import { getUpgradeableSettlementVertices } from '@/core/utils/city-upgrade-utils';
import { getPromotableKnights } from '@/core/utils/knight-upgrade-utils';
import { ProgressCardType } from '@/lib/types/player';
import { ProgressPromptProvider, useProgressPrompt } from '@/lib/hooks/useProgressPrompt';
import { MerchantPlacementModal } from './MerchantPlacementModal';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { TaxationPlacementModal } from './TaxationPlacementModal';
import { getCanonicalVertexId } from '@/lib/hex';
import { TreasonPlacementModal } from './TreasonPlacementModal';
import { TreasonEffect } from '@/lib/types/game';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { WeddingGiftModal } from './WeddingGiftModal';
import { BarbarianTrack } from './BarbarianTrack';
import { RobberVictimSelectionModal } from './RobberVictimSelectionModal';
import { RobberTheftNotification } from './RobberTheftNotification';

// Controllers and hooks
import { useSelectionManager } from '@/lib/hooks/useSelectionManager';
import { createKnightController, KnightController } from '@/lib/controllers/knight-controller';
import { createImprovementController, ImprovementController } from '@/lib/controllers/improvement-controller';
import { createProgressCardController, ProgressCardController } from '@/lib/controllers/progress-card-controller';

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

// Helper function to convert terrain to resource type
const resourceForTerrain = (terrain: string): ResourceType | null => {
    switch (terrain) {
        case 'forest': return 'wood';
        case 'hill': return 'brick';
        case 'pasture': return 'sheep';
        case 'field': return 'wheat';
        case 'mountain': return 'ore';
        default: return null;
    }
};

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    // Game state management
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [turnSubmitted, setTurnSubmitted] = useState(false);

    // Progress card discard modal
    const [showProgressCardDiscard, setShowProgressCardDiscard] = useState(false);
    const [progressDiscardContext, setProgressDiscardContext] = useState<'own_turn' | 'other_turn'>('own_turn');

    // VP and notification states
    const [vpCardModalType, setVpCardModalType] = useState<'printer' | 'constitution' | null>(null);
    const [lastVPAcknowledgedAt, setLastVPAcknowledgedAt] = useState<number | null>(null);
    const lastVPCardSeenRef = useRef<number>(0);

    // Robber victim selection (not in selectionManager)
    const [robberVictimSelectionOpen, setRobberVictimSelectionOpen] = useState(false);
    const [robberHexId, setRobberHexId] = useState<string | null>(null);
    const [robberPotentialVictims, setRobberPotentialVictims] = useState<string[]>([]);
    const [showTheftNotification, setShowTheftNotification] = useState(false);
    const lastTheftSeenRef = useRef<number>(0);

    // Consolidated selection state management
    const selectionManager = useSelectionManager();

    const MEDICINE_COST = { ore: 2, wheat: 1 } as const;
    const {
        selectedCard: selectedProgressCard,
        decorateCardHandler,
        clearSelectedCard
    } = useProgressCardSelectionDecorator();
    const engineeringPrompt = useProgressPrompt('engineer', selectionManager.selectingCityForEngineer);
    const merchantPrompt = useProgressPrompt('merchant', selectionManager.selectingHexForCard === 'merchant');
    const taxationPrompt = useProgressPrompt('taxation', selectionManager.selectingHexForCard === 'taxation');
    const metropolisPrompt = useProgressPrompt('metropolis', !!selectionManager.selectingCityForMetropolis);

    const router = useRouter();
    const { getOptimisticState, applyOptimisticUpdate, clearOptimisticUpdate } = useOptimisticGameState();
    const connectionStatus = useConnectionStatus();

    // Debug mode: enabled by default in development or via NEXT_PUBLIC_DEBUG_MODE env var
    const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    // Derived state for active turn and game mode
    const gameState = baseGameState ? getOptimisticState(baseGameState) : null;
    const currentPlayer = gameState?.players.find(p => p.id === playerId);
    const isCitiesAndKnights = gameState?.gameMode === 'cities_and_knights';
    const isActiveTurn = gameState?.currentTurn === playerId;

    // Treason effect state
    const treasonEffect = gameState?.activeEffects?.find(
        (effect: any): effect is TreasonEffect => effect?.type === 'treason'
    );
    const treasonInitiatorId = treasonEffect?.initiatorId;
    const isTreasonInitiator = treasonInitiatorId === playerId;
    const treasonTargetId = treasonEffect?.targetPlayerId;
    const isTreasonTarget = treasonTargetId === playerId;
    const treasonInitiatorName = treasonInitiatorId && gameState
        ? gameState.players.find(p => p.id === treasonInitiatorId)?.name
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
        taxationPrompt,
        engineeringPrompt,
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

    const handleRobberVictimRequest = (hexId: string, potentialVictims: string[]) => {
        setRobberHexId(hexId);
        setRobberPotentialVictims(potentialVictims);
        setRobberVictimSelectionOpen(true);
    };

    const handleRobberVictimSelected = async (victimId: string | null) => {
        if (!robberHexId) return;

        try {
            await moveRobber(roomId, playerId, robberHexId, victimId ?? undefined);
            setRobberVictimSelectionOpen(false);
            setRobberHexId(null);
            setRobberPotentialVictims([]);
        } catch (e) {
            console.error("Failed to move robber with victim", e);
        }
    };

    const handleRobberVictimCancel = () => {
        setRobberVictimSelectionOpen(false);
        setRobberHexId(null);
        setRobberPotentialVictims([]);
    };

    const handleDismissTheftNotification = () => {
        setShowTheftNotification(false);
    };

    const handleCancelSelection = () => {
        // Clear all selection state managed by selectionManager
        selectionManager.clearAllSelections();

        // Clear robber victim selection (not in selectionManager)
        setRobberVictimSelectionOpen(false);
        setRobberHexId(null);
        setRobberPotentialVictims([]);

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

    const handleCancelFollowupCard = () => {
        if (isRoadBuildingProgressActive) {
            progressCardController.handleCancelRoadBuildingProgress();
            return;
        }
        handleCancelSelection();
    };

    const handleDiscardProgressCards = async (cardsToDiscard: any[]) => {
        const shouldAutoEndTurn = progressDiscardContext === 'own_turn';

        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/discard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, cardsToDiscard })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to discard cards');
            }

            if (shouldAutoEndTurn) {
                await endTurn(roomId, playerId);
            }

            setShowProgressCardDiscard(false);
            setProgressDiscardContext('own_turn');
        } catch (e) {
            console.error('Error discarding progress cards:', e);
            throw e; // Re-throw to let dialog handle it
        }
    };

    const handleLoseCityToBarbarians = async (vertexId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/barbarian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'lose_city', playerId, vertexId })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to lose city');
            }
        } catch (e) {
            console.error('Error losing city to barbarians:', e);
            throw e;
        }
    };

    // Initial fetch to ensure we have data before subscription kicks in
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await fetch(`/api/game/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBaseGameState(data);
                }
            } catch (e) {
                console.error("Failed to fetch initial game state", e);
            }
        };
        fetchInitialState();
    }, [roomId]);

    // Auto-resolve stuck barbarian_attack phase (cleanup for old games)
    useEffect(() => {
        if (baseGameState?.phase === 'barbarian_attack') {
            const resolveStuckAttack = async () => {
                try {
                    console.log('Auto-resolving stuck barbarian attack...');
                    const res = await fetch(`/api/game/${roomId}/barbarian`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'resolve' })
                    });
                    if (!res.ok) {
                        console.error('Failed to auto-resolve barbarian attack');
                    }
                } catch (e) {
                    console.error('Error auto-resolving barbarian attack:', e);
                }
            };
            resolveStuckAttack();
        }
    }, [baseGameState?.phase, roomId]);

    // Realtime subscription
    const subscribedGameState = useGameSubscription(roomId, baseGameState);

    // Update local state when subscription updates
    useEffect(() => {
        if (subscribedGameState) {
            setBaseGameState(subscribedGameState);
        }
    }, [subscribedGameState]);

    // Show forced modal when the current player draws a VP progress card (auto-plays immediately).
    useEffect(() => {
        const gain = baseGameState?.lastVPCardGain;
        if (!gain) return;
        if (gain.cardType !== 'printer' && gain.cardType !== 'constitution') return;
        if (gain.playerId !== playerId) return;
        if (gain.timestamp <= lastVPCardSeenRef.current) return;

        // Only trigger for fresh draws to avoid resurfacing on unrelated state changes or reloads.
        const isRecent = Date.now() - gain.timestamp < 8000;
        if (!isRecent) return;

        lastVPCardSeenRef.current = gain.timestamp;
        setVpCardModalType(gain.cardType);
    }, [baseGameState?.lastVPCardGain, playerId]);

    // Show theft notification when the robber steals from or for the current player
    useEffect(() => {
        const theft = baseGameState?.lastTheft;
        if (!theft) return;
        if (!theft.timestamp) return;
        if (theft.timestamp <= lastTheftSeenRef.current) return;

        // Check if this player was involved (either as thief or victim)
        const isThief = theft.thiefId === playerId;
        const isVictim = theft.victimId === playerId || theft.victims?.some(v => v.victimId === playerId);

        if (!isThief && !isVictim) return;

        // Only trigger for recent thefts to avoid resurfacing on reloads
        const isRecent = Date.now() - theft.timestamp < 8000;
        if (!isRecent) return;

        lastTheftSeenRef.current = theft.timestamp;
        setShowTheftNotification(true);
    }, [baseGameState?.lastTheft, playerId]);

    // Automatically force a discard modal when another player's turn pushes us over the progress card limit
    useEffect(() => {
        if (!baseGameState) return;

        const effectiveState = getOptimisticState(baseGameState);
        const player = effectiveState.players.find(p => p.id === playerId);
        const cardCount = player?.progressCards?.length ?? 0;
        const overLimit = effectiveState.gameMode === 'cities_and_knights' && cardCount > 4;

        if (!overLimit) {
            if (showProgressCardDiscard) {
                setShowProgressCardDiscard(false);
            }
            if (progressDiscardContext !== 'own_turn') {
                setProgressDiscardContext('own_turn');
            }
            return;
        }

        const isPlayersTurn = effectiveState.currentTurn === playerId;
        if (!isPlayersTurn) {
            if (!showProgressCardDiscard || progressDiscardContext !== 'other_turn') {
                setProgressDiscardContext('other_turn');
                setShowProgressCardDiscard(true);
            }
        }
    }, [baseGameState, getOptimisticState, playerId, progressDiscardContext, showProgressCardDiscard]);

    // Clear local turn submission flag when turn changes or new turn starts
    useEffect(() => {
        if (!gameState) return;

        // Reset turnSubmitted when:
        // 1. It's no longer this player's turn (multiplayer)
        // 2. A new turn starts (phase changes to waiting_for_roll) (single-player)
        if (gameState.currentTurn !== playerId || gameState.phase === 'waiting_for_roll') {
            setTurnSubmitted(false);
        }
    }, [gameState?.currentTurn, gameState?.phase, playerId]);

    useEffect(() => {
        if (!selectedProgressCard || selectedProgressCard === 'road_building_progress') return;

        const hasActiveLocalSelection =
            !!selectionManager.selectingHexForCard ||
            !!selectionManager.selectingVertexForCard ||
            !!selectionManager.selectingEdgeForCard ||
            selectionManager.selectingCityForEngineer ||
            selectionManager.selectingCityForMedicine ||
            selectionManager.selectingCityForMetropolis ||
            selectionManager.selectingKnightsForSmith ||
            selectionManager.isCraneDialogOpen ||
            selectionManager.treasonMode !== null ||
            selectionManager.isTreasonModalOpen;

        if (!hasActiveLocalSelection) {
            clearSelectedCard();
        }
    }, [
        clearSelectedCard,
        selectionManager.isCraneDialogOpen,
        selectedProgressCard,
        selectionManager.selectingCityForEngineer,
        selectionManager.selectingCityForMedicine,
        selectionManager.selectingCityForMetropolis,
        selectionManager.selectingEdgeForCard,
        selectionManager.selectingHexForCard,
        selectionManager.selectingKnightsForSmith,
        selectionManager.selectingVertexForCard,
        selectionManager.treasonMode,
        selectionManager.isTreasonModalOpen
    ]);

    const showDiplomatPrompt = selectionManager.selectingEdgeForCard === 'diplomat' && selectionManager.diplomatStage !== null;
    const diplomatOwnerName = selectionManager.diplomatSelectedEdgeOwner && gameState
        ? gameState.players.find(p => p.id === selectionManager.diplomatSelectedEdgeOwner)?.name || 'Opponent'
        : null;
    const diplomatPromptStatus =
        selectionManager.diplomatError ||
        (selectionManager.diplomatStage === 'rebuild'
            ? (selectionManager.diplomatRelocateEdgeId ? 'New road position selected. Click Rebuild to place it.' : 'Select a highlighted edge to rebuild your road.')
            : selectionManager.diplomatSelectedEdgeId
                ? (selectionManager.diplomatSelectedEdgeOwner === playerId
                    ? 'Selected your road. Remove to relocate it.'
                    : `Selected ${diplomatOwnerName || 'an opponent'}'s road. Remove to return it.`)
                : 'Click any highlighted open road to select it.');

    // Derive intrigue display values
    const intrigueOpponent = selectionManager.intrigueTarget && gameState
        ? gameState.players.find(p => p.id === selectionManager.intrigueTarget!.opponentId)
        : null;
    const intrigueSelectedKnight = intrigueOpponent
        ? (intrigueOpponent.knights || []).find(k => k.id === selectionManager.intrigueTarget!.knightId)
        : null;
    const intrigueOpponentName = intrigueOpponent?.name || null;

    const showIntriguePrompt = selectionManager.selectingVertexForCard === 'intrigue';
    const intriguePromptStatus =
        selectionManager.intrigueError ||
        (selectionManager.isSubmittingIntrigue
            ? 'Displacing selected knight...'
            : intrigueSelectedKnight
                ? `Selected ${intrigueOpponentName || 'opponent'}'s ${intrigueSelectedKnight.level} knight. Click Displace to force relocation.`
                : 'Click a highlighted opponent knight adjacent to your roads.');
    const showEngineeringPrompt = engineeringPrompt.isVisible && !!isActiveTurn;
    const engineeringPromptStatus =
        engineeringPrompt.status || 'Select a city without a wall to add a free city wall.';
    const showRoadBuildingPrompt = roadBuildingPrompt.isVisible && !!isActiveTurn;
    const roadBuildingPromptStatus =
        roadBuildingPrompt.status || 'Place up to 2 roads for free on your network.';

    // Smith card selection - get promotable knight vertex IDs
    const smithEligibleVertexIds = gameState && selectionManager.selectingKnightsForSmith
        ? getPromotableKnights(gameState, playerId).map(k => k.vertexId)
        : [];

    const selectedMerchantHex = selectionManager.selectedMerchantHexId && gameState
        ? gameState.board.hexes.find(hex => hex.id === selectionManager.selectedMerchantHexId)
        : null;
    const selectedMerchantResource = selectedMerchantHex ? resourceForTerrain(selectedMerchantHex.terrain) : null;
    const showMerchantModal = selectionManager.isMerchantModalOpen && merchantPrompt.isVisible;
    const showTaxationModal = selectionManager.isTaxationModalOpen && taxationPrompt.isVisible;
    const taxationPromptStatus =
        taxationPrompt.status || 'Select any land hex to move the robber and steal 1 card from each opponent on it.';

    // Manage Treason staged flow UI based on active effect
    useEffect(() => {
        if (!treasonEffect) {
            if (selectionManager.treasonMode !== 'select_opponent') {
                resetTreasonLocalState();
            }
            if (selectionManager.selectingVertexForCard === 'treason_remove' || selectionManager.selectingVertexForCard === 'treason_place') {
                selectionManager.setSelectingVertexForCard(null);
            }
            return;
        }

        selectionManager.setIsTreasonModalOpen(true);
        if (treasonEffect.stage === 'awaiting_knight') {
            selectionManager.setTreasonSelectedPlacementVertexId(null);
            if (isTreasonTarget) {
                selectionManager.setTreasonMode('select_knight');
                selectionManager.setSelectingVertexForCard('treason_remove');
            } else if (isTreasonInitiator) {
                selectionManager.setTreasonMode('waiting_for_knight');
                if (selectionManager.selectingVertexForCard === 'treason_remove' || selectionManager.selectingVertexForCard === 'treason_place') {
                    selectionManager.setSelectingVertexForCard(null);
                }
            } else {
                selectionManager.setTreasonMode('waiting_for_knight');
            }
        } else if (treasonEffect.stage === 'awaiting_placement') {
            selectionManager.setTreasonSelectedKnightId(null);
            selectionManager.setTreasonSelectedPlacementVertexId(null);
            if (isTreasonInitiator) {
                selectionManager.setTreasonMode('place_knight');
                selectionManager.setSelectingVertexForCard('treason_place');
                selectionManager.setSelectingEdgeForCard(null);
                selectionManager.setSelectingHexForCard(null);
                selectionManager.setBuildMode(null);
                selectionManager.setMovingKnightId(null);
                selectionManager.setBuildingMetropolisType(null);
                selectionManager.setIsTreasonModalOpen(true);
            } else {
                // Target is done once they remove a knight
                resetTreasonLocalState();
                const currentSelection = selectionManager.selectingVertexForCard;
                if (currentSelection === 'treason_remove' || currentSelection === 'treason_place') {
                    selectionManager.setSelectingVertexForCard(null);
                }
            }
        }
    }, [isTreasonInitiator, isTreasonTarget, selectionManager.selectingVertexForCard, treasonEffect, selectionManager.treasonMode]);

    if (!gameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    const treasonOpponents = gameState.players
        .filter(p => p.id !== playerId)
        .map(p => {
            const knightCount = (p.knights || []).length;
            return {
                id: p.id,
                name: p.name,
                color: p.color ? p.color : undefined,
                knightCount,
                hasKnights: knightCount > 0
            };
        });

    const treasonEffectLevel = treasonEffect?.removedKnight?.level;
    const treasonSupplyAvailable = (() => {
        if (!treasonEffectLevel || !gameState || !isTreasonInitiator) return true;
        const knightCount = (gameState.players.find(p => p.id === playerId)?.knights || []).filter(k => k.level === treasonEffectLevel).length;
        return knightCount < 2;
    })();
    const treasonHasLegalPlacement = (() => {
        if (!gameState || !isTreasonInitiator) return true;
        return Object.keys(gameState.board.vertices).some(vId =>
            isValidKnightPlacement(gameState, vId, playerId)
        );
    })();

    const treasonStatus = (() => {
        if (selectionManager.treasonMode === 'waiting_for_knight' && treasonTargetId) {
            const targetName = gameState.players.find(p => p.id === treasonTargetId)?.name || 'opponent';
            return `Waiting for ${targetName} to remove a knight.`;
        }
        if (selectionManager.treasonMode === 'select_knight') {
            return selectionManager.treasonSelectedKnightId ? 'Selected knight. Click Remove to continue.' : 'Click one of your knights to remove it.';
        }
        if (selectionManager.treasonMode === 'place_knight') {
            if (!treasonSupplyAvailable) {
                return `No ${treasonEffectLevel || ''} knight pieces remain in your supply. Resolve to end Treason without placement.`;
            }
            if (!treasonHasLegalPlacement) {
                return 'No legal intersections connected to your roads. Resolve to end Treason without placement.';
            }
            return selectionManager.treasonSelectedPlacementVertexId
                ? 'Selected intersection. Click Place to finish.'
                : 'Click an empty intersection connected to your roads.';
        }
        return undefined;
    })();

    const showTreasonPlacePrompt =
        selectionManager.treasonMode === 'place_knight' &&
        selectionManager.selectingVertexForCard === 'treason_place' &&
        treasonSupplyAvailable &&
        treasonHasLegalPlacement;
    const showTreasonModal =
        selectionManager.isTreasonModalOpen &&
        selectionManager.treasonMode &&
        (selectionManager.treasonMode !== 'place_knight' || !treasonSupplyAvailable || !treasonHasLegalPlacement);


    const handleEndTurnClick = async () => {
        const cardCount = currentPlayer?.progressCards?.length ?? 0;
        if (isCitiesAndKnights && cardCount > 4) {
            setProgressDiscardContext('own_turn');
            setShowProgressCardDiscard(true);
            return;
        }

        const optimisticId = `end-turn-${roomId}`;
        const effectiveState = baseGameState ? getOptimisticState(baseGameState) : null;
        if (effectiveState && effectiveState.currentTurn === playerId) {
            const currentIndex = effectiveState.turnOrder.indexOf(playerId);
            const nextPlayerId = effectiveState.turnOrder[(currentIndex + 1) % effectiveState.turnOrder.length];
            applyOptimisticUpdate(optimisticId, (state) => {
                if (state.currentTurn !== playerId) return state;
                const nextId = nextPlayerId || state.currentTurn;
                return {
                    ...state,
                    currentTurn: nextId,
                    phase: 'waiting_for_roll',
                    diceRoll: undefined,
                    tradeOffer: null
                };
            });
        }

        setTurnSubmitted(true);
        try {
            await endTurn(roomId, playerId);
        } catch (e: any) {
            const message = typeof e?.message === 'string' ? e.message.toLowerCase() : '';
            if (!message.includes('not your turn')) {
                setTurnSubmitted(false);
            }
            console.error('Failed to end turn', e);
        } finally {
            clearOptimisticUpdate(optimisticId);
        }
    };

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

            <Board
                gameState={gameState}
                playerId={playerId}
                selectionState={{
                    buildMode: selectionManager.buildMode,
                    movingKnightId: selectionManager.movingKnightId,
                    buildingMetropolisType: selectionManager.buildingMetropolisType,
                    hexCardSelection: selectionManager.selectingHexForCard ? {
                        type: selectionManager.selectingHexForCard,
                        selectedHexId: selectionManager.selectingHexForCard === 'merchant' ? (selectionManager.selectedMerchantHexId ?? undefined) :
                                      selectionManager.selectingHexForCard === 'taxation' ? (selectionManager.selectedTaxationHexId ?? undefined) :
                                      undefined,
                        inventorSelection: selectionManager.inventorSelection ? {
                            firstHexId: selectionManager.inventorSelection.firstHexId,
                            secondHexId: selectionManager.inventorSelection.secondHexId
                        } : undefined
                    } : undefined,
                    vertexCardSelection: selectionManager.selectingVertexForCard ? {
                        type: selectionManager.selectingVertexForCard,
                        selectedKnightId: selectionManager.selectingVertexForCard === 'intrigue' ? selectionManager.intrigueTarget?.knightId ?? undefined :
                                         selectionManager.selectingVertexForCard === 'treason_remove' ? selectionManager.treasonSelectedKnightId ?? undefined :
                                         undefined,
                        placementVertexId: selectionManager.selectingVertexForCard === 'treason_place' ? selectionManager.treasonSelectedPlacementVertexId ?? undefined : undefined
                    } : undefined,
                    edgeCardSelection: selectionManager.selectingEdgeForCard ? {
                        type: selectionManager.selectingEdgeForCard,
                        stage: selectionManager.diplomatStage ?? undefined,
                        removedEdgeId: selectionManager.diplomatStage === 'rebuild' ? selectionManager.diplomatSelectedEdgeId ?? undefined : undefined,
                        relocatedEdgeId: selectionManager.diplomatRelocateEdgeId ?? undefined
                    } : undefined,
                    citySelection: selectionManager.selectingCityForEngineer ? {
                        type: 'engineer',
                        selectedCityId: selectionManager.selectedEngineerCityId ?? undefined
                    } : selectionManager.selectingCityForMedicine ? {
                        type: 'medicine'
                    } : selectionManager.selectingCityForMetropolis ? {
                        type: 'metropolis',
                        cityType: selectionManager.selectingCityForMetropolis,
                        selectedCityId: selectionManager.selectedMetropolisCityId ?? undefined
                    } : undefined,
                    smithSelection: selectionManager.selectingKnightsForSmith ? {
                        selectableKnightIds: smithEligibleVertexIds,
                        selectedKnightIds: selectionManager.selectedSmithKnightIds
                    } : undefined,
                    progressPrompt: showRoadBuildingPrompt ? {
                        cardType: 'road_building_progress',
                        visible: showRoadBuildingPrompt,
                        ready: isRoadBuildingProgressActive
                    } : undefined
                }}
                callbacks={{
                    onCancelBuild: handleCancelSelection,
                    onHexSelected: progressCardController.handleHexSelected,
                    onVertexSelectedForCard: progressCardController.handleVertexSelected,
                    onEdgeSelectedForCard: progressCardController.handleEdgeSelected,
                    onEngineerCitySelected: progressCardController.handleEngineerCitySelected,
                    onMedicineCitySelected: progressCardController.handleMedicineCitySelected,
                    onMetropolisCitySelected: improvementController.handleMetropolisCitySelected,
                    onCityClick: improvementController.handleCityClick,
                    onSettlementClick: improvementController.handleSettlementClick,
                    onKnightClick: knightController.handleKnightClick,
                    onBarbarianCitySelect: handleLoseCityToBarbarians,
                    onRobberVictimRequest: handleRobberVictimRequest
                }}
            />

            {showIntriguePrompt && (
                <BoardSelectionPrompt
                    title="Intrigue"
                    description="Select an opponent knight adjacent to your road network."
                    status={intriguePromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={progressCardController.handleConfirmIntrigueDisplacement}
                    finishLabel="Displace"
                    finishDisabled={!selectionManager.intrigueTarget || selectionManager.isSubmittingIntrigue}
                />
            )}

            {showTreasonPlacePrompt && (
                <BoardSelectionPrompt
                    title="Treason"
                    description="Place the captured knight on any empty intersection connected to your roads."
                    status={treasonStatus}
                    onCancel={progressCardController.handleCancelTreasonPlacement}
                    onFinish={progressCardController.handleConfirmTreasonPlacement}
                    finishLabel="Place"
                    finishDisabled={!selectionManager.treasonSelectedPlacementVertexId || selectionManager.isSubmittingTreason}
                />
            )}

            {showMerchantModal && (
                <MerchantPlacementModal
                    isOpen={showMerchantModal}
                    selectedResource={selectedMerchantResource}
                    status={merchantPrompt.status}
                    error={selectionManager.merchantError}
                    onCancel={handleCancelSelection}
                    onPlace={progressCardController.handleConfirmMerchantPlacement}
                />
            )}

            {showTreasonModal && (
                <TreasonPlacementModal
                    isOpen={showTreasonModal}
                    mode={selectionManager.treasonMode!}
                    opponents={treasonOpponents}
                    selectedOpponentId={selectionManager.treasonSelectedOpponentId}
                    initiatorName={treasonInitiatorName ?? undefined}
                    status={treasonStatus}
                    error={selectionManager.treasonError}
                    hasSelection={
                        selectionManager.treasonMode === 'select_opponent'
                            ? !!selectionManager.treasonSelectedOpponentId
                            : selectionManager.treasonMode === 'select_knight'
                                ? !!selectionManager.treasonSelectedKnightId
                                : selectionManager.treasonMode === 'place_knight'
                                    ? (treasonSupplyAvailable && treasonHasLegalPlacement
                                        ? !!selectionManager.treasonSelectedPlacementVertexId
                                        : true)
                                    : false
                    }
                    onSelectOpponent={
                        selectionManager.treasonMode === 'select_opponent'
                            ? (id) => {
                                selectionManager.setTreasonSelectedOpponentId(
                                    selectionManager.treasonSelectedOpponentId === id ? null : id
                                );
                                selectionManager.setTreasonError(null);
                            }
                            : undefined
                    }
                    onConfirm={
                        selectionManager.treasonMode === 'select_opponent'
                            ? progressCardController.handleConfirmTreasonOpponent
                            : selectionManager.treasonMode === 'select_knight'
                                ? progressCardController.handleConfirmTreasonKnightRemoval
                                : selectionManager.treasonMode === 'place_knight'
                                    ? progressCardController.handleConfirmTreasonPlacement
                                    : undefined
                    }
                    confirmLabel={
                        selectionManager.treasonMode === 'select_opponent'
                            ? 'Confirm'
                            : selectionManager.treasonMode === 'select_knight'
                                ? 'Remove'
                                : selectionManager.treasonMode === 'place_knight'
                                    ? (treasonSupplyAvailable && treasonHasLegalPlacement ? 'Place' : 'Resolve')
                                    : undefined
                    }
                    disableConfirm={selectionManager.isSubmittingTreason}
                    onCancel={
                        selectionManager.treasonMode === 'select_opponent'
                            ? () => resetTreasonLocalState()
                            : selectionManager.treasonMode === 'place_knight'
                                ? progressCardController.handleCancelTreasonPlacement
                                : undefined
                    }
                />
            )}

            {showTaxationModal && (
                <TaxationPlacementModal
                    isOpen={showTaxationModal}
                    status={taxationPromptStatus}
                    error={selectionManager.taxationError}
                    hasSelection={!!selectionManager.selectedTaxationHexId}
                    onCancel={handleCancelSelection}
                    onPlace={progressCardController.handleConfirmTaxationPlacement}
                />
            )}

            {showEngineeringPrompt && (
                <BoardSelectionPrompt
                    title="Engineering"
                    description="Click one of your cities without a wall to add a free city wall."
                    status={engineeringPromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={progressCardController.handleConfirmEngineerBuild}
                    finishLabel="Build"
                    finishDisabled={!selectionManager.selectedEngineerCityId || selectionManager.isEngineerSubmitting}
                />
            )}

            {showRoadBuildingPrompt && (
                <BoardSelectionPrompt
                    title="Road Building"
                    description="Place up to 2 roads for free on your network."
                    status={roadBuildingPromptStatus}
                    onCancel={progressCardController.handleCancelRoadBuildingProgress}
                    onFinish={progressCardController.handleFinalizeRoadBuildingProgress}
                    finishLabel="Build"
                />
            )}

            {showDiplomatPrompt && (
                <BoardSelectionPrompt
                    title="Diplomat"
                    description={selectionManager.diplomatStage === 'rebuild' ? 'Place your moved road on any legal edge.' : 'Select an open road to remove.'}
                    status={diplomatPromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={selectionManager.diplomatStage === 'rebuild' ? progressCardController.handleConfirmDiplomatRebuild : progressCardController.handleConfirmDiplomatRemove}
                    finishLabel={selectionManager.diplomatStage === 'rebuild' ? 'Rebuild' : 'Remove'}
                    finishDisabled={
                        selectionManager.isSubmittingDiplomat ||
                        (selectionManager.diplomatStage === 'rebuild' ? !selectionManager.diplomatRelocateEdgeId : !selectionManager.diplomatSelectedEdgeId)
                    }
                />
            )}

            {selectionManager.isInventorConfirmOpen && selectionManager.inventorSelection.firstValue !== undefined && selectionManager.inventorSelection.secondValue !== undefined && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCancelSelection} />
                    <div
                        className="relative bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-6 w-[360px] space-y-4 pointer-events-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold">Confirm Inventor Swap</h3>
                        <p className="text-sm text-slate-200">
                            Swap <span className="font-semibold text-emerald-300">#{selectionManager.inventorSelection.firstValue}</span> with{' '}
                            <span className="font-semibold text-cyan-300">#{selectionManager.inventorSelection.secondValue}</span>?
                        </p>
                        {selectionManager.inventorError && (
                            <div className="text-sm text-red-200 bg-red-900/50 border border-red-600 rounded-md px-3 py-2">
                                {selectionManager.inventorError}
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                className="px-4 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                                onClick={handleCancelSelection}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow cursor-pointer"
                                onClick={progressCardController.handleConfirmInventorSwap}
                            >
                                Confirm Swap
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {vpCardModalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto">
                    <div className="bg-slate-900 border border-amber-500/60 rounded-xl shadow-2xl p-6 w-[360px] text-white">
                        <div className="text-sm uppercase tracking-wide text-amber-300 mb-2">Victory Point Card</div>
                        <div className="text-xl font-bold text-amber-100 mb-3">
                            {vpCardModalType === 'printer' ? 'Printing (1 VP)' : 'Constitution (1 VP)'}
                        </div>
                        <p className="text-slate-200 text-sm mb-3">
                            {vpCardModalType === 'printer'
                                ? 'Printing is a Victory Point progress card. It plays immediately and adds +1 VP to your total.'
                                : 'Constitution is a Victory Point progress card. It plays immediately and adds +1 VP to your total.'}
                        </p>
                        <p className="text-slate-300 text-xs mb-4">
                            This card cannot be cancelled or held. Click &ldquo;Play Card&rdquo; to acknowledge and continue.
                        </p>
                        <button
                            className="w-full bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg hover:bg-amber-300 transition cursor-pointer"
                            onClick={() => {
                                setLastVPAcknowledgedAt(Date.now());
                                setVpCardModalType(null);
                            }}
                        >
                            Play Card
                        </button>
                    </div>
                </div>
            )}

            <DiscardModal gameState={gameState} playerId={playerId} />

            {/* Robber Victim Selection Modal */}
            <RobberVictimSelectionModal
                isOpen={robberVictimSelectionOpen}
                gameState={gameState}
                potentialVictims={robberPotentialVictims}
                onSelectVictim={handleRobberVictimSelected}
                onCancel={handleRobberVictimCancel}
            />

            {/* Robber Theft Notification */}
            {showTheftNotification && gameState.lastTheft && (() => {
                const theft = gameState.lastTheft;
                const isThief = theft.thiefId === playerId;

                // Find the specific item stolen from/to this player
                let stolenItem = null;
                if (isThief) {
                    // Show total stolen across all victims
                    stolenItem = theft.items?.[0] || null;
                } else {
                    // Show what was stolen from this specific victim
                    const victimData = theft.victims?.find(v => v.victimId === playerId);
                    stolenItem = victimData?.items?.[0] || null;
                }

                const thief = gameState.players.find(p => p.id === theft.thiefId);
                const victim = gameState.players.find(p => p.id === theft.victimId) ||
                              gameState.players.find(p => theft.victims?.some(v => v.victimId === p.id));

                return (
                    <RobberTheftNotification
                        isOpen={showTheftNotification}
                        stolenItem={stolenItem}
                        wasVictim={!isThief}
                        thiefName={thief?.name}
                        victimName={victim?.name}
                        onDismiss={handleDismissTheftNotification}
                    />
                );
            })()}

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

            {showTrade && (
                <TradeModal
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setShowTrade(false)}
                />
            )}

            {/* Aqueduct Modal */}
            {gameState.phase === 'aqueduct_selection' && gameState.pendingAqueduct?.includes(playerId) && (
                <AqueductModal gameState={gameState} playerId={playerId} />
            )}

            {/* Commercial Harbor - Initiator Dialog (rendered from ProgressCardHand) */}

            {/* Commercial Harbor - Opponent Response Modal */}
            {gameState.pendingCommercialHarbor && (
                <CommercialHarborModal gameState={gameState} playerId={playerId} roomId={roomId} />
            )}

            {gameState.pendingWedding && (
                <WeddingGiftModal gameState={gameState} playerId={playerId} roomId={roomId} />
            )}

            {/* Barbarian City Selection UI */}
            {gameState.phase === 'barbarian_city_selection' && gameState.pendingBarbarianVictims?.includes(playerId) && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
                    <h3 className="text-xl font-bold">⚔️ Barbarians Attacked!</h3>
                    <p className="text-center">
                        The barbarians have sacked your lands!<br />
                        <span className="font-bold text-red-300">Click on a city to destroy it.</span>
                    </p>
                </div>
            )}

            <TradeOfferDisplay gameState={gameState} playerId={playerId} />

            {/* Knight Displacement UI */}
            {gameState.phase === 'knight_displacement' && gameState.pendingDisplacement?.playerId === playerId && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white p-6 rounded-lg shadow-xl z-50 flex flex-col items-center gap-4 pointer-events-auto border border-red-500">
                    <h3 className="text-xl font-bold">Your Knight Was Displaced!</h3>
                    {(() => {
                        const validTargets = getValidRelocationTargets(
                            gameState,
                            playerId,
                            gameState.pendingDisplacement!.originVertexId
                        );
                        const hasValidTargets = validTargets.length > 0;

                        return (
                            <>
                                <p className="text-center max-w-md">
                                    {hasValidTargets
                                        ? "One of your knights was displaced by a stronger opponent. Click on any empty intersection connected by your roads to relocate it."
                                        : "No valid intersections available to relocate your knight. You must remove it from the board."
                                    }
                                </p>
                                {!hasValidTargets && (
                                    <div className="flex gap-4">
                                        <button
                                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition-colors"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/game/${roomId}/knight`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            playerId,
                                                            action: 'relocate',
                                                            knightId: gameState.pendingDisplacement!.knightId,
                                                            targetVertexId: null // Remove
                                                        })
                                                    });
                                                    if (!res.ok) throw new Error('Failed to remove knight');
                                                } catch (e) {
                                                    console.error('Error removing knight:', e);
                                                }
                                            }}
                                        >
                                            Remove Knight
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4">

                {/* Top Right: CompactGameStatus (player cards only) */}
                <div className="absolute top-4 right-4 w-80 pointer-events-auto overflow-x-visible">
                    <CompactGameStatus
                        gameState={gameState}
                        currentPlayerId={playerId}
                        onOpenCityManagement={handleOpenPlayerCityManagement}
                    />
                </div>

                {/* Upper Left: Barbarian Track (C&K only) */}
                {isCitiesAndKnights && (
                    <div
                        className="absolute left-4 pointer-events-auto z-20"
                        style={{ top: '4.25rem' }}
                    >
                        <BarbarianTrack gameState={gameState} />
                    </div>
                )}

                {/* Bottom Left: Debug + Build + Resources | Progress Cards */}
                <div className="absolute bottom-4 left-4 flex items-end gap-4 pointer-events-auto">
                    {/* Left Column: Debug (left-aligned) + Build/Resources (right-aligned) */}
                    <div className="flex flex-col items-end gap-2">
                        {/* Debug Panel (left-aligned, above Build) */}
                        {isDebugMode && currentPlayer && (
                            <div className="self-start pointer-events-auto">
                                <DebugPanel player={currentPlayer} roomId={roomId} />
                            </div>
                        )}

                        {/* Build Controls (right-aligned) */}
                        <div className={promptBlocksUI ? 'opacity-60 pointer-events-none' : ''}>
                            <BuildControls
                                gameState={gameState}
                                playerId={playerId}
                                buildMode={selectionManager.buildMode}
                                onSetBuildMode={selectionManager.setBuildMode}
                            />
                        </div>
                        <div className="flex items-center gap-4 max-w-full overflow-x-auto">
                            {currentPlayer && (
                                <PlayerHand
                                    player={currentPlayer}
                                    roomId={roomId}
                                    lastTheft={gameState.lastTheft}
                                />
                            )}
                            {!isCitiesAndKnights && (
                                <PlayerDevCards gameState={gameState} playerId={playerId} />
                            )}
                        </div>
                    </div>

                    {/* Progress Cards spanning full height (C&K only) */}
                    {isCitiesAndKnights && currentPlayer && (
                        <div className="flex-shrink-0">
                            <ProgressCardHand
                                player={currentPlayer}
                                roomId={roomId}
                                gameState={gameState}
                                onPlayCard={progressCardController.handlePlayProgressCard}
                                onStartHexSelection={progressCardController.handleStartHexSelection}
                                onStartVertexSelection={progressCardController.handleStartVertexSelection}
                                onStartEdgeSelection={progressCardController.handleStartEdgeSelection}
                                onStartCrane={improvementController.handleStartCraneDialog}
                                onStartEngineerSelection={progressCardController.handleStartEngineerSelection}
                                onStartSmithSelection={knightController.handleStartSmithSelection}
                                onStartMedicineSelection={progressCardController.handleStartMedicineSelection}
                                onStartTreasonSelection={progressCardController.handleStartTreasonSelection}
                                isActiveTurn={isActiveTurn}
                                isEngineerSelecting={engineerSelectionActive}
                                isSmithSelecting={selectionManager.selectingKnightsForSmith}
                                isMedicineSelecting={selectionManager.selectingCityForMedicine}
                                activeFollowupCard={activeProgressCard === 'metropolis' ? null : activeProgressCard}
                                onCancelFollowupCard={handleCancelFollowupCard}
                                decorateCardHandler={decorateCardHandler}
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Right: Actions + Log/Chat/Stats side by side */}
                <div className="absolute bottom-4 right-4 flex items-end gap-4 pointer-events-auto">
                    {/* Left: Dice + Trade/End controls */}
                    <div className={`flex flex-col items-center gap-2 ${promptBlocksUI ? 'opacity-60 pointer-events-none' : ''}`}>
                        {/* Dice Display */}
                        <DiceDisplay diceRoll={gameState.diceRoll} eventDieRoll={gameState.eventDieRoll} />

                        {/* Action Controls (Roll/Trade/End) */}
                        <ActionControls
                            gameState={gameState}
                            playerId={playerId}
                            onOpenTrade={() => setShowTrade(true)}
                            onEndTurn={handleEndTurnClick}
                            turnSubmitted={turnSubmitted}
                        />
                    </div>

                    {/* Right: Log/Chat/Stats Tabs */}
                    <div className="w-80">
                        <SidebarTabs
                            logs={gameState.logs || []}
                            diceStats={gameState.diceStats}
                            eventDieStats={gameState.eventDieStats}
                            players={gameState.players}
                        />
                    </div>
                </div>
            </div>
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
