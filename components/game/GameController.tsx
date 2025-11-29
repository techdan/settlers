'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Board } from '@/components/board/Board';
import { GameState } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { PlayerHand } from './PlayerHand';
import { GameLog } from './GameLog';
import { PlayerDevCards } from './PlayerDevCards';

import { GameStatus } from './GameStatus';
import { BuildControls } from './BuildControls';
import { ActionControls } from './ActionControls';
import { DiceDisplay } from './DiceDisplay';
import { DiscardModal } from './DiscardModal';
import { TradeModal } from './TradeModal';
import { TradeOfferDisplay } from './TradeOfferDisplay';
import { BoardSelectionPrompt } from './BoardSelectionPrompt';
import { buildCityWall, endTurn } from '@/app/actions';
import { AqueductModal } from './AqueductModal';

// Cities & Knights components
import { CityManagementDialog } from './CityManagementDialog';
import { KnightManagementDialog } from './KnightManagementDialog';
import { getValidRelocationTargets } from '@/core/engine/knights/knight-manager';

import { BarbarianTrack } from './BarbarianTrack';
import { EventDieDisplay } from './EventDieDisplay';
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

interface GameControllerProps {
    roomId: string;
    playerId: string;
}

const GameControllerInner: React.FC<GameControllerProps> = ({ roomId, playerId }) => {
    const [baseGameState, setBaseGameState] = useState<GameState | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null>(null);
    const [movingKnightId, setMovingKnightId] = useState<string | null>(null);
    const [buildingMetropolisType, setBuildingMetropolisType] = useState<'science' | 'trade' | 'politics' | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
    const [selectedKnightId, setSelectedKnightId] = useState<string | null>(null);
    const [isCraneDialogOpen, setIsCraneDialogOpen] = useState(false);

    // Progress card board selection states
    const [selectingHexForCard, setSelectingHexForCard] = useState<'merchant' | 'inventor' | null>(null);
    const [selectingVertexForCard, setSelectingVertexForCard] = useState<'intrigue' | null>(null);
    const [selectingEdgeForCard, setSelectingEdgeForCard] = useState<'diplomat' | null>(null);
    const [inventorSelection, setInventorSelection] = useState<{ firstHexId?: string; firstValue?: number; secondHexId?: string; secondValue?: number }>({});
    const [isInventorConfirmOpen, setIsInventorConfirmOpen] = useState(false);
    const [inventorError, setInventorError] = useState<string | null>(null);
    const [showProgressCardDiscard, setShowProgressCardDiscard] = useState(false);
    const [progressDiscardContext, setProgressDiscardContext] = useState<'own_turn' | 'other_turn'>('own_turn');
    const [selectingCityForEngineer, setSelectingCityForEngineer] = useState(false);
    const [selectingCityForMedicine, setSelectingCityForMedicine] = useState(false);
    const [selectingKnightsForSmith, setSelectingKnightsForSmith] = useState(false);
    const [selectedSmithKnightIds, setSelectedSmithKnightIds] = useState<string[]>([]);
    const [smithError, setSmithError] = useState<string | null>(null);
    const MEDICINE_COST = { ore: 2, wheat: 1 } as const;
    const [vpCardModalType, setVpCardModalType] = useState<'printer' | 'constitution' | null>(null);
    const lastVPCardSeenRef = useRef<number>(0);
    const {
        selectedCard: selectedProgressCard,
        decorateCardHandler,
        clearSelectedCard
    } = useProgressCardSelectionDecorator();
    const [lastVPAcknowledgedAt, setLastVPAcknowledgedAt] = useState<number | null>(null);

    const router = useRouter();
    const { getOptimisticState } = useOptimisticGameState();
    const connectionStatus = useConnectionStatus();

    // Debug mode: enabled by default in development or via NEXT_PUBLIC_DEBUG_MODE env var
    const isDebugMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    // C&K action handlers
    const handleCityClick = (vertexId: string) => {
        setSelectedCityId(vertexId);
        setBuildMode(null);
    };

    const handleKnightClick = (knightId: string) => {
        if (selectingKnightsForSmith) {
            handleSmithKnightSelected(knightId);
            return;
        }

        setSelectedKnightId(knightId);
        setBuildMode(null);
    };

    const handleUpgradeImprovement = async (improvement: 'science' | 'trade' | 'politics') => {
        const res = await fetch(`/api/game/${roomId}/improvement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, action: 'upgrade', improvement })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to upgrade improvement');
        }
    };

    const handleStartCraneDialog = () => {
        if (isCraneDialogOpen) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setIsCraneDialogOpen(true);
        setSelectedCityId(null);
        setSelectedKnightId(null);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
    };

    const handleCraneUpgrade = async (improvement: 'science' | 'trade' | 'politics') => {
        await handlePlayProgressCard('crane', { improvement });
        setIsCraneDialogOpen(false);
    };

    const handleBuildCityWall = async (vertexId: string) => {
        await buildCityWall(roomId, playerId, vertexId);
    };



    const handleActivateKnight = async (knightId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/knight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'activate', knightId })
            });
            if (!res.ok) throw new Error('Failed to activate knight');
        } catch (e) {
            console.error('Error activating knight:', e);
        }
    };

    const handleMoveKnight = async (knightId: string) => {
        // Enter knight movement mode - player will click target vertex
        setMovingKnightId(knightId);
        setBuildMode(null); // Clear any other build mode
    };

    const handleUpgradeKnight = async (knightId: string) => {
        try {
            const res = await fetch(`/api/game/${roomId}/knight`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'upgrade', knightId })
            });
            if (!res.ok) throw new Error('Failed to upgrade knight');
        } catch (e) {
            console.error('Error upgrading knight:', e);
        }
    };

    const handleBuildMetropolis = (metropolisType: 'science' | 'trade' | 'politics') => {
        // Enter metropolis building mode - player will click a city vertex
        setBuildingMetropolisType(metropolisType);
        setBuildMode(null); // Clear any other build mode
        setMovingKnightId(null); // Clear knight movement mode
    };

    const handlePlayProgressCard = async (cardType: any, options?: any) => {
        try {
            if (cardType === 'road_building_progress') {
                roadBuildingPrompt.begin();
            }
            const res = await fetch(`/api/game/${roomId}/progress-card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, cardType, options: options || {} })
            });
            if (!res.ok) {
                const errorData = await res.json();
                if (cardType === 'road_building_progress') {
                    roadBuildingPrompt.clear();
                }
                throw new Error(errorData.error || 'Failed to play progress card');
            }
        } catch (e: any) {
            if (cardType === 'road_building_progress') {
                roadBuildingPrompt.clear();
            }
            console.error('Error playing progress card:', e);
            throw e; // Re-throw so calling code can handle it
        }
    };

    const handleStartHexSelection = (cardType: 'merchant' | 'inventor') => {
        if (selectingHexForCard === cardType) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setSelectingHexForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setInventorSelection({});
        setInventorError(null);
        setIsInventorConfirmOpen(false);
    };

    const handleHexSelected = async (hexId: string) => {
        if (!selectingHexForCard) return;

        // Handle multi-step selection (e.g. Inventor needs 2 hexes)
        if (selectingHexForCard === 'inventor') {
            if (isInventorConfirmOpen) return;

            const selectedHex = gameState.board.hexes.find(h => h.id === hexId);
            const tokenValue = selectedHex?.numberToken;
            if (!selectedHex || !tokenValue) return;

            // First selection or reselection
            if (!inventorSelection.firstHexId || inventorSelection.firstHexId === hexId) {
                setInventorSelection({ firstHexId: hexId, firstValue: tokenValue });
                setInventorError(null);
                return;
            }

            // Second selection (must be different)
            if (inventorSelection.firstHexId === hexId) return;

            setInventorSelection(prev => ({ ...prev, secondHexId: hexId, secondValue: tokenValue }));
            setInventorError(null);
            setIsInventorConfirmOpen(true);
            return;
        }

        // Single hex selection cards
        await handlePlayProgressCard(selectingHexForCard, { hexId });
        setSelectingHexForCard(null);
    };

    const handleConfirmInventorSwap = async () => {
        if (!inventorSelection.firstHexId || !inventorSelection.secondHexId) return;
        try {
            await handlePlayProgressCard('inventor', {
                hex1Id: inventorSelection.firstHexId,
                hex2Id: inventorSelection.secondHexId
            });
            setIsInventorConfirmOpen(false);
            setInventorSelection({});
            handleCancelSelection();
        } catch (e: any) {
            const message = e?.message || 'Failed to swap number tokens';
            setInventorError(message);
        }
    };

    const handleEngineerCitySelected = async (vertexId: string) => {
        try {
            await handlePlayProgressCard('engineer', { vertexId });
            setSelectingCityForEngineer(false);
        } catch (e) {
            console.error('Failed to build city wall with Engineering', e);
        }
    };

    const handleMedicineCitySelected = async (vertexId: string) => {
        try {
            await handlePlayProgressCard('medicine', { vertexId });
            setSelectingCityForMedicine(false);
        } catch (e) {
            console.error('Failed to upgrade settlement with Medicine', e);
        }
    };

    const handleStartVertexSelection = (cardType: 'intrigue') => {
        if (selectingVertexForCard === cardType) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setSelectingVertexForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setSelectingEdgeForCard(null);
    };

    const handleStartEdgeSelection = (cardType: 'diplomat') => {
        if (selectingEdgeForCard === cardType) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setSelectingEdgeForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setSelectingVertexForCard(null);
    };

    const handleCancelRoadBuildingProgress = async () => {
        roadBuildingPrompt.hide();
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/road-building`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'cancel' })
            });
            if (!res.ok) {
                const error = await res.json();
                const message = error.error || 'Failed to cancel Road Building';
                if (message.toLowerCase().includes('no active road building')) {
                    roadBuildingPrompt.clear();
                    clearSelectedCard();
                    return;
                }
                throw new Error(message);
            }
            clearSelectedCard();
            roadBuildingPrompt.clear();
        } catch (e) {
            console.error('Failed to cancel Road Building progress card', e);
            roadBuildingPrompt.clear();
        }
    };

    const handleFinalizeRoadBuildingProgress = async () => {
        roadBuildingPrompt.hide();
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/road-building`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'complete' })
            });
            if (!res.ok) {
                const error = await res.json();
                const message = error.error || 'Failed to finish Road Building';
                if (message.toLowerCase().includes('no active road building')) {
                    roadBuildingPrompt.clear();
                    clearSelectedCard();
                    return;
                }
                throw new Error(message);
            }
            clearSelectedCard();
            roadBuildingPrompt.clear();
        } catch (e) {
            console.error('Failed to finalize Road Building progress card', e);
            roadBuildingPrompt.clear();
        }
    };

    const handleStartEngineerSelection = () => {
        if (!baseGameState) return;
        const effectiveState = getOptimisticState(baseGameState);
        const eligible = getEligibleCityWallVertices(effectiveState, playerId, { ignoreCost: true });
        if (eligible.length === 0) return;
        if (selectingCityForEngineer) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setSelectingCityForEngineer(true);
    };

    const handleStartSmithSelection = () => {
        if (!baseGameState) return;
        const effectiveState = getOptimisticState(baseGameState);
        const promotableKnights = effectiveState ? getPromotableKnights(effectiveState, playerId) : [];

        if (promotableKnights.length === 0) return;

        if (selectingKnightsForSmith) {
            handleCancelSelection();
            return;
        }

        handleCancelSelection();
        setSelectingKnightsForSmith(true);
        setSelectedSmithKnightIds([]);
        setSmithError(null);
    };

    const handleSmithKnightSelected = (knightId: string) => {
        if (!selectingKnightsForSmith) return;

        const effectiveState = baseGameState ? getOptimisticState(baseGameState) : null;
        const promotableKnights = effectiveState ? getPromotableKnights(effectiveState, playerId) : [];
        const isPromotable = promotableKnights.some(k => k.id === knightId);
        if (!isPromotable) return;

        setSmithError(null);
        setSelectedSmithKnightIds(prev => {
            if (prev.includes(knightId)) {
                return prev.filter(id => id !== knightId);
            }
            if (prev.length >= 2) {
                return [prev[0], knightId];
            }
            return [...prev, knightId];
        });
    };

    const handleConfirmSmithPromotions = async () => {
        if (selectedSmithKnightIds.length === 0) return;

        try {
            await handlePlayProgressCard('smith', { knightIds: selectedSmithKnightIds });
            setSelectingKnightsForSmith(false);
            setSelectedSmithKnightIds([]);
            setSmithError(null);
        } catch (e: any) {
            setSmithError(e?.message || 'Failed to promote knights');
        }
    };

    const handleStartMedicineSelection = () => {
        if (!baseGameState) return;
        const effectiveState = getOptimisticState(baseGameState);
        const player = effectiveState.players.find(p => p.id === playerId);

        const hasResources =
            !!player &&
            (player.resources.ore ?? 0) >= MEDICINE_COST.ore &&
            (player.resources.wheat ?? 0) >= MEDICINE_COST.wheat;
        const hasCityToken = (player?.citiesRemaining ?? 0) > 0;
        const eligibleSettlements = getUpgradeableSettlementVertices(effectiveState, playerId);

        if (!hasResources || !hasCityToken || eligibleSettlements.length === 0) return;

        if (selectingCityForMedicine) {
            handleCancelSelection();
            return;
        }

        handleCancelSelection();
        setSelectingCityForMedicine(true);
    };

    const handleVertexSelected = async (vertexId: string) => {
        if (!selectingVertexForCard) return;

        if (selectingVertexForCard === 'intrigue') {
            // Intrigue: Move opponent's knight to this location
            const targetKnight = baseGameState?.players
                .flatMap(p => p.knights || [])
                .find(k => k.vertexId === vertexId);

            if (targetKnight) {
                await handlePlayProgressCard(selectingVertexForCard, {
                    knightId: targetKnight.id,
                    targetVertexId: vertexId
                });
            }
        }

        setSelectingVertexForCard(null);
    };

    const handleEdgeSelected = async (edgeId: string) => {
        if (!selectingEdgeForCard) return;

        if (selectingEdgeForCard === 'diplomat') {
            // Diplomat: Select an open road to remove
            // For now, just remove it (no replacement)
            // TODO: Add second step to allow rebuilding road if it was player's own
            await handlePlayProgressCard(selectingEdgeForCard, {
                edgeId: edgeId
            });
        }

        setSelectingEdgeForCard(null);
    };


    const handleCancelSelection = () => {
        setSelectingHexForCard(null);
        setSelectingVertexForCard(null);
        setSelectingEdgeForCard(null);
        setInventorSelection({});
        setInventorError(null);
        setIsInventorConfirmOpen(false);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setSelectingCityForEngineer(false);
        setSelectingKnightsForSmith(false);
        setSelectedSmithKnightIds([]);
        setSmithError(null);
        setSelectingCityForMedicine(false);
        setIsCraneDialogOpen(false);
        clearSelectedCard();
    };

    const handleCancelFollowupCard = () => {
        if (isRoadBuildingProgressActive) {
            handleCancelRoadBuildingProgress();
            return;
        }
        handleCancelSelection();
    };

    const handleDiscardProgressCards = async (cardsToDiscard: any[]) => {
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

    useEffect(() => {
        if (!selectedProgressCard || selectedProgressCard === 'road_building_progress') return;

        const hasActiveLocalSelection =
            !!selectingHexForCard ||
            !!selectingVertexForCard ||
            !!selectingEdgeForCard ||
            selectingCityForEngineer ||
            selectingCityForMedicine ||
            selectingKnightsForSmith ||
            isCraneDialogOpen;

        if (!hasActiveLocalSelection) {
            clearSelectedCard();
        }
    }, [
        clearSelectedCard,
        isCraneDialogOpen,
        selectedProgressCard,
        selectingCityForEngineer,
        selectingCityForMedicine,
        selectingEdgeForCard,
        selectingHexForCard,
        selectingKnightsForSmith,
        selectingVertexForCard
    ]);

    // Apply optimistic updates on top of base state (null-safe for hook order)
    const gameState = baseGameState ? getOptimisticState(baseGameState) : null;

    const smithEligibleKnights = selectingKnightsForSmith && gameState ? getPromotableKnights(gameState, playerId) : [];
    const smithEligibleVertexIds = smithEligibleKnights.map(k => k.vertexId).filter(Boolean);

    const currentPlayer = gameState?.players.find(p => p.id === playerId);
    const isCitiesAndKnights = gameState?.gameMode === 'cities_and_knights';
    const isActiveTurn = gameState?.currentTurn === playerId;
    const roadBuildingEffect = gameState?.activeEffects?.find(
        (effect: any) => effect?.type === 'road_building_progress' && effect.playerId === playerId
    );
    const roadBuildingPlacedCount = Array.isArray((roadBuildingEffect as any)?.placedEdges)
        ? (roadBuildingEffect as any).placedEdges.length
        : 0;
    const isRoadBuildingProgressActive = !!roadBuildingEffect && !!isActiveTurn;
    const roadBuildingCompleted = (roadBuildingEffect as any)?.completed === true;
    const roadBuildingPrompt = useProgressPrompt('road_building_progress', isRoadBuildingProgressActive);
    const showRoadBuildingPrompt = roadBuildingPrompt.isVisible;
    const roadBuildingPromptStatus =
        roadBuildingPrompt.status ||
        (roadBuildingCompleted
            ? `Placed ${roadBuildingPlacedCount}/2. Finish or cancel to undo both.`
            : `Placed ${roadBuildingPlacedCount}/2 roads.`);

    if (!gameState) return <div className="flex items-center justify-center h-screen text-white">Loading game state...</div>;

    const handleEndTurnClick = async () => {
        const cardCount = currentPlayer?.progressCards?.length ?? 0;
        if (isCitiesAndKnights && cardCount > 4) {
            setProgressDiscardContext('own_turn');
            setShowProgressCardDiscard(true);
            return;
        }

        await endTurn(roomId, playerId);
    };

    const activeProgressCard: ProgressCardType | null = (() => {
        if (showRoadBuildingPrompt) return 'road_building_progress';
        if (selectingHexForCard) return selectingHexForCard;
        if (selectingVertexForCard) return selectingVertexForCard;
        if (selectingEdgeForCard) return selectingEdgeForCard;
        if (selectingKnightsForSmith) return 'smith';
        if (selectingCityForMedicine) return 'medicine';
        if (selectingCityForEngineer) return 'engineer';
        if (isCraneDialogOpen) return 'crane';
        if (selectedProgressCard) return selectedProgressCard;
        return null;
    })();
    const promptBlocksUI = showRoadBuildingPrompt;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Connection Status Indicator */}
            <ConnectionStatusIndicator
                status={connectionStatus.status}
                consecutiveFailures={connectionStatus.consecutiveFailures}
                lastError={connectionStatus.lastError}
            />

            {selectingKnightsForSmith && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/90 border border-blue-500/60 rounded-lg px-4 py-3 shadow-lg pointer-events-auto">
                    <div className="text-sm text-white">
                        <div className="font-semibold">Smithing: promote up to 2 knights</div>
                        <div className="text-xs text-slate-300">Click your knights on the board to select them.</div>
                        <div className="text-xs text-slate-200 mt-1">Selected {selectedSmithKnightIds.length}/2</div>
                    </div>
                    {smithError && (
                        <div className="text-xs text-red-200 bg-red-900/50 border border-red-600 rounded px-3 py-2">
                            {smithError}
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
                            className={`px-3 py-2 rounded-md font-semibold shadow transition-colors ${selectedSmithKnightIds.length === 0
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                }`}
                            disabled={selectedSmithKnightIds.length === 0}
                            onClick={handleConfirmSmithPromotions}
                        >
                            Promote
                        </button>
                    </div>
                </div>
            )}

            <Board
                gameState={gameState}
                playerId={playerId}
                buildMode={buildMode}
                onCancelBuild={handleCancelSelection}
                movingKnightId={movingKnightId}
                buildingMetropolisType={buildingMetropolisType}
                selectingHexForCard={selectingHexForCard}
                selectingVertexForCard={selectingVertexForCard}
                selectingEdgeForCard={selectingEdgeForCard}
                selectingCityForEngineer={selectingCityForEngineer}
                selectingCityForMedicine={selectingCityForMedicine}
                selectingKnightsForSmith={selectingKnightsForSmith}
                smithSelectableKnightIds={smithEligibleVertexIds}
                smithSelectedKnightIds={selectedSmithKnightIds}
                progressPromptCardType={showRoadBuildingPrompt ? 'road_building_progress' : null}
                progressPromptVisible={showRoadBuildingPrompt}
                progressPromptReady={isRoadBuildingProgressActive}
                inventorSelection={inventorSelection}
                onHexSelected={handleHexSelected}
                onVertexSelectedForCard={handleVertexSelected}
                onEdgeSelectedForCard={handleEdgeSelected}
                onEngineerCitySelected={handleEngineerCitySelected}
                onMedicineCitySelected={handleMedicineCitySelected}
                onCityClick={handleCityClick}
                onKnightClick={handleKnightClick}
                onBarbarianCitySelect={handleLoseCityToBarbarians}
            />

            {showRoadBuildingPrompt && (
                <BoardSelectionPrompt
                    title="Road Building"
                    description="Place up to 2 roads for free on your network."
                    status={roadBuildingPromptStatus}
                    onCancel={handleCancelRoadBuildingProgress}
                    onFinish={handleFinalizeRoadBuildingProgress}
                    finishLabel="Build"
                />
            )}

            {isInventorConfirmOpen && inventorSelection.firstValue !== undefined && inventorSelection.secondValue !== undefined && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCancelSelection} />
                    <div
                        className="relative bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-6 w-[360px] space-y-4 pointer-events-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold">Confirm Inventor Swap</h3>
                        <p className="text-sm text-slate-200">
                            Swap <span className="font-semibold text-emerald-300">#{inventorSelection.firstValue}</span> with{' '}
                            <span className="font-semibold text-cyan-300">#{inventorSelection.secondValue}</span>?
                        </p>
                        {inventorError && (
                            <div className="text-sm text-red-200 bg-red-900/50 border border-red-600 rounded-md px-3 py-2">
                                {inventorError}
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
                                onClick={handleConfirmInventorSwap}
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

            {/* City Management Dialog (C&K) */}
            {selectedCityId && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    vertexId={selectedCityId}
                    onClose={() => setSelectedCityId(null)}
                    onUpgradeImprovement={handleUpgradeImprovement}
                    onBuildWall={handleBuildCityWall}
                />
            )}

            {isCraneDialogOpen && (
                <CityManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    onClose={() => setIsCraneDialogOpen(false)}
                    onCraneUpgrade={handleCraneUpgrade}
                    variant="crane"
                />
            )}

            {/* Knight Management Dialog (C&K) */}
            {selectedKnightId && (
                <KnightManagementDialog
                    gameState={gameState}
                    playerId={playerId}
                    knightId={selectedKnightId}
                    onClose={() => setSelectedKnightId(null)}
                    onActivate={handleActivateKnight}
                    onUpgrade={handleUpgradeKnight}
                    onMove={handleMoveKnight}
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

                {/* Left Sidebar: Game Log & Debug Panel */}
                {/* Positioned below Map Controls (approx top-20) */}
                <div className="absolute top-48 left-4 bottom-24 w-80 flex flex-col gap-4 pointer-events-auto">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <GameLog logs={gameState.logs || []} />
                    </div>
                    {/* Debug Panel */}
                    {isDebugMode && currentPlayer && (
                        <DebugPanel player={currentPlayer} roomId={roomId} />
                    )}
                </div>

                {/* Right Sidebar: Status + C&K Components */}
                <div className="absolute top-4 right-4 w-80 flex flex-col gap-4 pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <GameStatus
                        gameState={gameState}
                        currentPlayerId={playerId}
                        vpAckTimestamp={lastVPAcknowledgedAt}
                    />
                    {isCitiesAndKnights && (
                        <>
                            <EventDieDisplay gameState={gameState} />
                            <BarbarianTrack gameState={gameState} />
                        </>
                    )}
                </div>

                {/* Bottom Center: Build Controls & Resources */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-auto max-w-[90vw]">
                    {/* Build Controls */}
                    <div className={promptBlocksUI ? 'opacity-60 pointer-events-none' : ''}>
                        <BuildControls
                            gameState={gameState}
                            playerId={playerId}
                            buildMode={buildMode}
                            onSetBuildMode={setBuildMode}
                        />
                    </div>

                    {/* Resources, Commodities & Dev Cards / Progress Cards */}
                    <div className="flex gap-4 items-stretch max-w-full overflow-x-auto">
                        {currentPlayer && <PlayerHand player={currentPlayer} roomId={roomId} lastTheft={gameState.lastTheft} />}
                        {isCitiesAndKnights && currentPlayer && (
                            <>
                                <ProgressCardHand
                                    player={currentPlayer}
                                    roomId={roomId}
                                    gameState={gameState}
                                    onPlayCard={handlePlayProgressCard}
                                    onStartHexSelection={handleStartHexSelection}
                                    onStartVertexSelection={handleStartVertexSelection}
                                    onStartEdgeSelection={handleStartEdgeSelection}
                                    onStartCrane={handleStartCraneDialog}
                                    onStartEngineerSelection={handleStartEngineerSelection}
                                    onStartSmithSelection={handleStartSmithSelection}
                                    onStartMedicineSelection={handleStartMedicineSelection}
                                    isActiveTurn={isActiveTurn}
                                    isEngineerSelecting={selectingCityForEngineer}
                                    isSmithSelecting={selectingKnightsForSmith}
                                    isMedicineSelecting={selectingCityForMedicine}
                                    activeFollowupCard={activeProgressCard}
                                    onCancelFollowupCard={handleCancelFollowupCard}
                                    decorateCardHandler={decorateCardHandler}
                                />
                            </>
                        )}
                        {!isCitiesAndKnights && <PlayerDevCards gameState={gameState} playerId={playerId} />}

                    </div>
                </div>

                {/* Bottom Right: Dice & Actions */}
                <div className={`absolute bottom-4 right-4 flex flex-col items-end gap-4 pointer-events-auto ${promptBlocksUI ? 'opacity-60 pointer-events-none' : ''}`}>
                    <DiceDisplay diceRoll={gameState.diceRoll} eventDieRoll={gameState.eventDieRoll} />
                    <ActionControls
                        gameState={gameState}
                        playerId={playerId}
                        onOpenTrade={() => setShowTrade(true)}
                        onEndTurn={handleEndTurnClick}
                    />
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
