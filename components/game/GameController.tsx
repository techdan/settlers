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
import { CommercialHarborModal } from './CommercialHarborModal';
import { CommercialHarborInitiatorDialog } from './CommercialHarborInitiatorDialog';

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
import { MerchantPlacementModal } from './MerchantPlacementModal';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { TaxationPlacementModal } from './TaxationPlacementModal';
import { getCanonicalVertexId } from '@/lib/hex';
import { TreasonPlacementModal } from './TreasonPlacementModal';
import { TreasonEffect } from '@/lib/types/game';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';
import { WeddingGiftModal } from './WeddingGiftModal';

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
    const [selectingCityForMetropolis, setSelectingCityForMetropolis] = useState<'science' | 'trade' | 'politics' | null>(null);
    const [selectedMetropolisCityId, setSelectedMetropolisCityId] = useState<string | null>(null);
    const [isMetropolisSubmitting, setIsMetropolisSubmitting] = useState(false);

    // Progress card board selection states
    const [selectingHexForCard, setSelectingHexForCard] = useState<'merchant' | 'inventor' | 'taxation' | null>(null);
    const [selectingVertexForCard, setSelectingVertexForCard] = useState<'intrigue' | 'treason_remove' | 'treason_place' | null>(null);
    const [selectingEdgeForCard, setSelectingEdgeForCard] = useState<'diplomat' | null>(null);
    const [intrigueTarget, setIntrigueTarget] = useState<{ knightId: string; opponentId: string; vertexId: string } | null>(null);
    const [intrigueError, setIntrigueError] = useState<string | null>(null);
    const [isSubmittingIntrigue, setIsSubmittingIntrigue] = useState(false);
    const [inventorSelection, setInventorSelection] = useState<{ firstHexId?: string; firstValue?: number; secondHexId?: string; secondValue?: number }>({});
    const [isInventorConfirmOpen, setIsInventorConfirmOpen] = useState(false);
    const [inventorError, setInventorError] = useState<string | null>(null);
    const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
    const [selectedMerchantHexId, setSelectedMerchantHexId] = useState<string | null>(null);
    const [merchantError, setMerchantError] = useState<string | null>(null);
    const [isTaxationModalOpen, setIsTaxationModalOpen] = useState(false);
    const [selectedTaxationHexId, setSelectedTaxationHexId] = useState<string | null>(null);
    const [taxationError, setTaxationError] = useState<string | null>(null);
    const [diplomatStage, setDiplomatStage] = useState<'remove' | 'rebuild' | null>(null);
    const [diplomatSelectedEdgeId, setDiplomatSelectedEdgeId] = useState<string | null>(null);
    const [diplomatSelectedEdgeOwner, setDiplomatSelectedEdgeOwner] = useState<string | null>(null);
    const [diplomatRelocateEdgeId, setDiplomatRelocateEdgeId] = useState<string | null>(null);
    const [diplomatError, setDiplomatError] = useState<string | null>(null);
    const [isSubmittingDiplomat, setIsSubmittingDiplomat] = useState(false);
    const [isTreasonModalOpen, setIsTreasonModalOpen] = useState(false);
    const [treasonMode, setTreasonMode] = useState<'select_opponent' | 'waiting_for_knight' | 'select_knight' | 'place_knight' | null>(null);
    const [treasonSelectedOpponentId, setTreasonSelectedOpponentId] = useState<string | null>(null);
    const [treasonSelectedKnightId, setTreasonSelectedKnightId] = useState<string | null>(null);
    const [treasonSelectedPlacementVertexId, setTreasonSelectedPlacementVertexId] = useState<string | null>(null);
    const [treasonError, setTreasonError] = useState<string | null>(null);
    const [isSubmittingTreason, setIsSubmittingTreason] = useState(false);
    const [showProgressCardDiscard, setShowProgressCardDiscard] = useState(false);
    const [progressDiscardContext, setProgressDiscardContext] = useState<'own_turn' | 'other_turn'>('own_turn');
    const [selectingCityForEngineer, setSelectingCityForEngineer] = useState(false);
    const [selectedEngineerCityId, setSelectedEngineerCityId] = useState<string | null>(null);
    const [isEngineerSubmitting, setIsEngineerSubmitting] = useState(false);
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
    const engineeringPrompt = useProgressPrompt('engineer', selectingCityForEngineer);
    const merchantPrompt = useProgressPrompt('merchant', selectingHexForCard === 'merchant');
    const taxationPrompt = useProgressPrompt('taxation', selectingHexForCard === 'taxation');
    const metropolisPrompt = useProgressPrompt('metropolis', !!selectingCityForMetropolis);

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

        // Check if player reached level 4 or 5 and is eligible for metropolis
        if (gameState) {
            const player = gameState.players.find(p => p.id === playerId);
            const newLevel = (player?.improvements?.[improvement] || 0) + 1;
            const metropolis = gameState.metropolises?.[improvement];
            const metropolisOwner = metropolis?.owner;
            const metropolisOwnerPlayer = metropolisOwner ? gameState.players.find(p => p.id === metropolisOwner) : null;
            const metropolisOwnerLevel = metropolisOwnerPlayer?.improvements?.[improvement] || 0;

            // Check if player has cities
            const playerCities = Object.values(gameState.board.vertices).filter(v =>
                v.owner === playerId && v.structure === 'city'
            );

            // Only show metropolis selection if:
            // 1. Level 4 and metropolis is unclaimed (first build), OR
            // 2. Level 5 and can steal from someone at level 4
            // Note: Securing your own metropolis at level 5 does NOT require selection - it stays in place
            const canClaimMetropolis = newLevel === 4 && !metropolisOwner;
            const canStealMetropolis = newLevel === 5 && metropolisOwner && metropolisOwner !== playerId && metropolisOwnerLevel < 5;

            if ((canClaimMetropolis || canStealMetropolis) && playerCities.length > 0) {
                setSelectedCityId(null); // Close city management
                handleStartMetropolisSelection(improvement);
            }
        }
    };

    const handleStartMetropolisSelection = (improvement: 'science' | 'trade' | 'politics') => {
        if (!baseGameState) return;
        const playerCities = Object.values(baseGameState.board.vertices).filter(v =>
            v.owner === playerId && v.structure === 'city'
        );
        if (playerCities.length === 0) return;

        handleCancelSelection();
        setSelectedMetropolisCityId(null);
        const improvementName = improvement === 'science' ? 'Science' : improvement === 'trade' ? 'Trade' : 'Politics';
        metropolisPrompt.begin(`Select a city to upgrade to ${improvementName} Metropolis`);
        setSelectingCityForMetropolis(improvement);
    };

    const handleMetropolisCitySelected = (vertexId: string) => {
        if (isMetropolisSubmitting) return;
        if (selectedMetropolisCityId === vertexId) {
            setSelectedMetropolisCityId(null);
            const improvementName = selectingCityForMetropolis === 'science' ? 'Science' : selectingCityForMetropolis === 'trade' ? 'Trade' : 'Politics';
            metropolisPrompt.setStatus(`Select a city to upgrade to ${improvementName} Metropolis`);
            return;
        }
        setSelectedMetropolisCityId(vertexId);
        metropolisPrompt.setStatus('City selected. Click Confirm to upgrade to Metropolis.');
    };

    const handleConfirmMetropolisBuild = async () => {
        if (!selectedMetropolisCityId || !selectingCityForMetropolis) return;
        setIsMetropolisSubmitting(true);
        metropolisPrompt.setStatus('Upgrading to metropolis...');
        try {
            const res = await fetch(`/api/game/${roomId}/metropolis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    action: 'select_city',
                    vertexId: selectedMetropolisCityId,
                    improvementType: selectingCityForMetropolis
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to select metropolis city');
            }

            setSelectingCityForMetropolis(null);
            setSelectedMetropolisCityId(null);
            metropolisPrompt.clear();
        } catch (e: any) {
            const message = e?.message || 'Failed to upgrade to metropolis';
            metropolisPrompt.setStatus(message);
            console.error('Failed to upgrade to metropolis', e);
        } finally {
            setIsMetropolisSubmitting(false);
        }
    };

    const resourceForTerrain = (terrain: TerrainType): ResourceType | null => {
        switch (terrain) {
            case 'forest':
                return 'wood';
            case 'hill':
                return 'brick';
            case 'pasture':
                return 'sheep';
            case 'field':
                return 'wheat';
            case 'mountain':
                return 'ore';
            default:
                return null;
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

    const handleStartHexSelection = (cardType: 'merchant' | 'inventor' | 'taxation') => {
        if (selectingHexForCard === cardType) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();

        if (cardType === 'merchant') {
            setSelectingHexForCard('merchant');
            setIsMerchantModalOpen(true);
            setSelectedMerchantHexId(null);
            setMerchantError(null);
            merchantPrompt.begin('Select a resource hex.');
            setBuildMode(null);
            setMovingKnightId(null);
            setBuildingMetropolisType(null);
            return;
        }

        if (cardType === 'taxation') {
            setSelectingHexForCard('taxation');
            setIsTaxationModalOpen(true);
            setSelectedTaxationHexId(null);
            setTaxationError(null);
            taxationPrompt.begin('Select a hex to move the robber.');
            setBuildMode(null);
            setMovingKnightId(null);
            setBuildingMetropolisType(null);
            return;
        }

        setSelectingHexForCard(cardType);
        setBuildMode(null);
        setMovingKnightId(null);
        setBuildingMetropolisType(null);
        setInventorSelection({});
        setInventorError(null);
        setIsInventorConfirmOpen(false);
    };

    const handleHexSelected = async (hexId: string) => {
        if (!selectingHexForCard || !gameState) return;

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

        if (selectingHexForCard === 'merchant') {
            setSelectedMerchantHexId(hexId);
            setMerchantError(null);

            const selectedHex = gameState.board.hexes.find(h => h.id === hexId);
            const resource = selectedHex ? resourceForTerrain(selectedHex.terrain) : null;
            const resourceStatus = resource ? `Selected ${resource}.` : 'Select a resource hex.';
            merchantPrompt.setStatus(resourceStatus);
            return;
        }

        if (selectingHexForCard === 'taxation') {
            setSelectedTaxationHexId(hexId);
            setTaxationError(null);

            const [q, r] = hexId.split(',').map(Number);
            const adjacentVertices = Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));
            const opponents = adjacentVertices
                .map(id => gameState.board.vertices[id])
                .filter(v => v && v.owner && v.owner !== playerId && v.structure);
            const opponentNames = Array.from(
                new Set(
                    opponents
                        .map(v => gameState.players.find(p => p.id === v?.owner)?.name)
                        .filter((name): name is string => !!name)
                )
            );
            const status = opponentNames.length > 0
                ? `Robber will target ${opponentNames.join(', ')}.`
                : 'No opponent buildings on this hex.';
            taxationPrompt.setStatus(status);
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

    const handleConfirmMerchantPlacement = async () => {
        if (!selectedMerchantHexId) return;
        setMerchantError(null);
        merchantPrompt.setStatus('Placing Merchant...');
        try {
            await handlePlayProgressCard('merchant', { hexId: selectedMerchantHexId });
            merchantPrompt.clear();
            handleCancelSelection();
        } catch (e: any) {
            const message = e?.message || 'Failed to place Merchant';
            setMerchantError(message);
            merchantPrompt.setStatus(message);
        }
    };

    const handleConfirmTaxationPlacement = async () => {
        if (!selectedTaxationHexId) return;
        setTaxationError(null);
        taxationPrompt.setStatus('Moving robber and stealing...');
        try {
            await handlePlayProgressCard('taxation', { hexId: selectedTaxationHexId });
            taxationPrompt.clear();
            handleCancelSelection();
        } catch (e: any) {
            const message = e?.message || 'Failed to resolve Taxation';
            setTaxationError(message);
            taxationPrompt.setStatus(message);
        }
    };

    const handleEngineerCitySelected = (vertexId: string) => {
        if (isEngineerSubmitting) return;
        if (selectedEngineerCityId === vertexId) {
            setSelectedEngineerCityId(null);
            engineeringPrompt.setStatus('Select a city without a wall for Engineering');
            return;
        }
        setSelectedEngineerCityId(vertexId);
        engineeringPrompt.setStatus('City selected. Click Build to confirm.');
    };

    const handleConfirmEngineerBuild = async () => {
        if (!selectedEngineerCityId) return;
        setIsEngineerSubmitting(true);
        engineeringPrompt.setStatus('Building city wall...');
        try {
            await handlePlayProgressCard('engineer', { vertexId: selectedEngineerCityId });
            setSelectingCityForEngineer(false);
            setSelectedEngineerCityId(null);
            engineeringPrompt.clear();
            clearSelectedCard();
        } catch (e: any) {
            const message = e?.message || 'Failed to build city wall with Engineering';
            engineeringPrompt.setStatus(message);
            console.error('Failed to build city wall with Engineering', e);
        } finally {
            setIsEngineerSubmitting(false);
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
        setIntrigueTarget(null);
        setIntrigueError(null);
        setIsSubmittingIntrigue(false);
    };

    const handleStartEdgeSelection = (cardType: 'diplomat') => {
        if (selectingEdgeForCard === cardType) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setDiplomatStage('remove');
        setDiplomatSelectedEdgeId(null);
        setDiplomatSelectedEdgeOwner(null);
        setDiplomatRelocateEdgeId(null);
        setDiplomatError(null);
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
        if (!baseGameState || !isActiveTurn) return;
        const effectiveState = getOptimisticState(baseGameState);
        const eligible = getEligibleCityWallVertices(effectiveState, playerId, { ignoreCost: true });
        if (eligible.length === 0) return;
        if (selectingCityForEngineer) {
            handleCancelSelection();
            return;
        }
        handleCancelSelection();
        setSelectedEngineerCityId(null);
        engineeringPrompt.begin('Select a city without a wall for Engineering');
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

    const resetTreasonLocalState = (keepModal = false) => {
        if (!keepModal) setIsTreasonModalOpen(false);
        setTreasonMode(null);
        setTreasonSelectedOpponentId(null);
        setTreasonSelectedKnightId(null);
        setTreasonSelectedPlacementVertexId(null);
        setTreasonError(null);
        setIsSubmittingTreason(false);
    };

    const handleStartTreasonSelection = () => {
        // Clear other selection modes, then start treason opponent selection
        handleCancelSelection();
        setIsTreasonModalOpen(true);
        setTreasonMode('select_opponent');
        setTreasonSelectedOpponentId(null);
        setTreasonError(null);
    };

    const handleVertexSelected = async (vertexId: string) => {
        if (!selectingVertexForCard) return;

        if (selectingVertexForCard === 'treason_remove') {
            const knightAtVertex = gameState?.players
                .flatMap(p => p.knights || [])
                .find(k => k.vertexId === vertexId);

            if (!knightAtVertex || knightAtVertex.playerId !== playerId) {
                setTreasonError('Select one of your knights to remove.');
                setTreasonSelectedKnightId(null);
                return;
            }

            setTreasonError(null);
            setTreasonSelectedKnightId(prev => (prev === knightAtVertex.id ? null : knightAtVertex.id));
            return;
        }

        if (selectingVertexForCard === 'treason_place') {
            setTreasonError(null);
            setTreasonSelectedPlacementVertexId(prev => (prev === vertexId ? null : vertexId));
            return;
        }

        if (selectingVertexForCard === 'intrigue') {
            const targetPlayer = gameState?.players.find(p => (p.knights || []).some(k => k.vertexId === vertexId));
            const targetKnight = targetPlayer?.knights?.find(k => k.vertexId === vertexId);

            if (!targetPlayer || !targetKnight || targetPlayer.id === playerId) {
                setIntrigueError('Select an opponent knight adjacent to your roads.');
                setIntrigueTarget(null);
                return;
            }

            setIntrigueError(null);
            setIntrigueTarget(prev => {
                if (prev?.knightId === targetKnight.id) {
                    return null;
                }
                return {
                    knightId: targetKnight.id,
                    opponentId: targetPlayer.id,
                    vertexId
                };
            });
            return;
        }

        setSelectingVertexForCard(null);
    };

    const handleEdgeSelected = (edgeId: string) => {
        if (!selectingEdgeForCard || selectingEdgeForCard !== 'diplomat') return;

        // Stage: selecting a road to remove
        if (diplomatStage !== 'rebuild') {
            const edge = gameState?.board.edges[edgeId];
            setDiplomatSelectedEdgeId(edgeId);
            setDiplomatSelectedEdgeOwner(edge?.owner ?? null);
            setDiplomatError(null);
            return;
        }

        // Stage: selecting where to rebuild
        setDiplomatRelocateEdgeId(edgeId);
        setDiplomatError(null);
    };

    const handleConfirmDiplomatRemove = async () => {
        if (!diplomatSelectedEdgeId || diplomatStage !== 'remove') return;
        setIsSubmittingDiplomat(true);
        try {
            if (diplomatSelectedEdgeOwner && diplomatSelectedEdgeOwner !== playerId) {
                await handlePlayProgressCard('diplomat', { edgeId: diplomatSelectedEdgeId });
                handleCancelSelection();
                return;
            }

            if (diplomatSelectedEdgeOwner === playerId) {
                setDiplomatStage('rebuild');
                setDiplomatRelocateEdgeId(null);
                setDiplomatError(null);
                return;
            }

            setDiplomatError('Select an open road to remove.');
        } catch (e: any) {
            setDiplomatError(e?.message || 'Failed to resolve Diplomat');
        } finally {
            setIsSubmittingDiplomat(false);
        }
    };

    const handleConfirmDiplomatRebuild = async () => {
        if (diplomatStage !== 'rebuild' || !diplomatSelectedEdgeId || !diplomatRelocateEdgeId) return;
        setIsSubmittingDiplomat(true);
        try {
            await handlePlayProgressCard('diplomat', {
                edgeId: diplomatSelectedEdgeId,
                newEdgeId: diplomatRelocateEdgeId
            });
            handleCancelSelection();
        } catch (e: any) {
            setDiplomatError(e?.message || 'Failed to rebuild road with Diplomat');
        } finally {
            setIsSubmittingDiplomat(false);
        }
    };

    const handleConfirmIntrigueDisplacement = async () => {
        if (!intrigueTarget) return;
        setIsSubmittingIntrigue(true);
        try {
            await handlePlayProgressCard('intrigue', {
                opponentId: intrigueTarget.opponentId,
                knightId: intrigueTarget.knightId
            });
            handleCancelSelection();
        } catch (e: any) {
            setIntrigueError(e?.message || 'Failed to displace knight');
        } finally {
            setIsSubmittingIntrigue(false);
        }
    };

    const handleConfirmTreasonOpponent = async () => {
        if (!treasonSelectedOpponentId) {
            setTreasonError('Select an opponent with at least one knight.');
            return;
        }
        setIsSubmittingTreason(true);
        setTreasonError(null);
        try {
            await handlePlayProgressCard('treason', { opponentId: treasonSelectedOpponentId });
            setTreasonMode('waiting_for_knight');
        } catch (e: any) {
            setTreasonError(e?.message || 'Failed to start Treason');
        } finally {
            setIsSubmittingTreason(false);
        }
    };

    const handleConfirmTreasonKnightRemoval = async () => {
        if (!treasonSelectedKnightId) {
            setTreasonError('Select a knight to remove.');
            return;
        }
        setIsSubmittingTreason(true);
        setTreasonError(null);
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/treason`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    action: 'remove_knight',
                    knightId: treasonSelectedKnightId
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to remove knight');
            }
            // Target is done after removing their knight
            if (isTreasonTarget) {
                resetTreasonLocalState();
                setSelectingVertexForCard(prev => (prev === 'treason_remove' ? null : prev));
            }
        } catch (e: any) {
            setTreasonError(e?.message || 'Failed to remove knight');
        } finally {
            setIsSubmittingTreason(false);
        }
    };

    const handleConfirmTreasonPlacement = async () => {
        const shouldRequireVertex = treasonSupplyAvailable && treasonHasLegalPlacement;
        const chosenVertex = shouldRequireVertex ? treasonSelectedPlacementVertexId : null;

        if (shouldRequireVertex && !chosenVertex) {
            setTreasonError('Select an empty intersection connected to your road.');
            return;
        }
        setIsSubmittingTreason(true);
        setTreasonError(null);
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/treason`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    action: 'place_knight',
                    vertexId: chosenVertex
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to place knight');
            }
            resetTreasonLocalState();
            setSelectingVertexForCard(prev => (prev === 'treason_place' ? null : prev));
        } catch (e: any) {
            setTreasonError(e?.message || 'Failed to place knight');
        } finally {
            setIsSubmittingTreason(false);
        }
    };

    const handleCancelTreasonPlacement = async () => {
        if (treasonMode !== 'place_knight') {
            handleCancelSelection();
            return;
        }
        setIsSubmittingTreason(true);
        setTreasonError(null);
        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/treason`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    action: 'cancel'
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to cancel Treason');
            }
            handleCancelSelection();
        } catch (e: any) {
            setTreasonError(e?.message || 'Failed to cancel Treason');
        } finally {
            setIsSubmittingTreason(false);
        }
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
        setIsMerchantModalOpen(false);
        setSelectedMerchantHexId(null);
        setMerchantError(null);
        setIsTaxationModalOpen(false);
        setSelectedTaxationHexId(null);
        setTaxationError(null);
        setSelectingCityForEngineer(false);
        setSelectedEngineerCityId(null);
        setIsEngineerSubmitting(false);
        setSelectingCityForMetropolis(null);
        setSelectedMetropolisCityId(null);
        setIsMetropolisSubmitting(false);
        setSelectingKnightsForSmith(false);
        setSelectedSmithKnightIds([]);
        setSmithError(null);
        setSelectingCityForMedicine(false);
        setIsCraneDialogOpen(false);
        setDiplomatStage(null);
        setDiplomatSelectedEdgeId(null);
        setDiplomatSelectedEdgeOwner(null);
        setDiplomatRelocateEdgeId(null);
        setDiplomatError(null);
        setIsSubmittingDiplomat(false);
        setIntrigueTarget(null);
        setIntrigueError(null);
        setIsSubmittingIntrigue(false);
        if (!treasonEffect || treasonMode === 'select_opponent') {
            resetTreasonLocalState(false);
            setSelectingVertexForCard(prev => (prev === 'treason_remove' || prev === 'treason_place' ? null : prev));
        }
        clearSelectedCard();
        engineeringPrompt.clear();
        merchantPrompt.clear();
        taxationPrompt.clear();
        metropolisPrompt.clear();
    };

    const handleCancelFollowupCard = () => {
        if (isRoadBuildingProgressActive) {
            handleCancelRoadBuildingProgress();
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
            selectingCityForMetropolis ||
            selectingKnightsForSmith ||
            isCraneDialogOpen ||
            treasonMode !== null ||
            isTreasonModalOpen;

        if (!hasActiveLocalSelection) {
            clearSelectedCard();
        }
    }, [
        clearSelectedCard,
        isCraneDialogOpen,
        selectedProgressCard,
        selectingCityForEngineer,
        selectingCityForMedicine,
        selectingCityForMetropolis,
        selectingEdgeForCard,
        selectingHexForCard,
        selectingKnightsForSmith,
        selectingVertexForCard,
        treasonMode,
        isTreasonModalOpen
    ]);

    // Apply optimistic updates on top of base state (null-safe for hook order)
    const gameState = baseGameState ? getOptimisticState(baseGameState) : null;

    const treasonEffect = gameState?.activeEffects?.find(
        (effect: any): effect is TreasonEffect => effect?.type === 'treason'
    );
    const treasonInitiatorId = treasonEffect?.initiatorId;
    const treasonInitiatorName = treasonInitiatorId
        ? gameState?.players.find(p => p.id === treasonInitiatorId)?.name
        : undefined;
    const treasonTargetId = treasonEffect?.targetPlayerId;
    const isTreasonInitiator = treasonInitiatorId === playerId;
    const isTreasonTarget = treasonTargetId === playerId;

    const smithEligibleKnights = selectingKnightsForSmith && gameState ? getPromotableKnights(gameState, playerId) : [];
    const smithEligibleVertexIds = smithEligibleKnights.map(k => k.vertexId).filter(Boolean);
    const intrigueSelectedKnight = intrigueTarget && gameState
        ? gameState.players.flatMap(p => p.knights || []).find(k => k.id === intrigueTarget.knightId)
        : null;
    const intrigueOpponentName = intrigueTarget && gameState
        ? gameState.players.find(p => p.id === intrigueTarget.opponentId)?.name
        : null;

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
    const showDiplomatPrompt = selectingEdgeForCard === 'diplomat' && diplomatStage !== null;
    const diplomatOwnerName = diplomatSelectedEdgeOwner && gameState
        ? gameState.players.find(p => p.id === diplomatSelectedEdgeOwner)?.name || 'Opponent'
        : null;
    const diplomatPromptStatus =
        diplomatError ||
        (diplomatStage === 'rebuild'
            ? (diplomatRelocateEdgeId ? 'New road position selected. Click Rebuild to place it.' : 'Select a highlighted edge to rebuild your road.')
            : diplomatSelectedEdgeId
                ? (diplomatSelectedEdgeOwner === playerId
                    ? 'Selected your road. Remove to relocate it.'
                    : `Selected ${diplomatOwnerName || 'an opponent'}'s road. Remove to return it.`)
                : 'Click any highlighted open road to select it.');
    const showIntriguePrompt = selectingVertexForCard === 'intrigue';
    const intriguePromptStatus =
        intrigueError ||
        (isSubmittingIntrigue
            ? 'Displacing selected knight...'
            : intrigueSelectedKnight
                ? `Selected ${intrigueOpponentName || 'opponent'}'s ${intrigueSelectedKnight.level} knight. Click Displace to force relocation.`
                : 'Click a highlighted opponent knight adjacent to your roads.');
    const showEngineeringPrompt = engineeringPrompt.isVisible && !!isActiveTurn;
    const engineeringPromptStatus =
        engineeringPrompt.status || 'Select a city without a wall to add a free city wall.';
    const selectedMerchantHex = selectedMerchantHexId && gameState
        ? gameState.board.hexes.find(hex => hex.id === selectedMerchantHexId)
        : null;
    const selectedMerchantResource = selectedMerchantHex ? resourceForTerrain(selectedMerchantHex.terrain) : null;
    const showMerchantModal = isMerchantModalOpen && merchantPrompt.isVisible;
    const showTaxationModal = isTaxationModalOpen && taxationPrompt.isVisible;
    const taxationPromptStatus =
        taxationPrompt.status || 'Select any land hex to move the robber and steal 1 card from each opponent on it.';

    // Manage Treason staged flow UI based on active effect
    useEffect(() => {
        if (!treasonEffect) {
            if (treasonMode !== 'select_opponent') {
                resetTreasonLocalState();
            }
            if (selectingVertexForCard === 'treason_remove' || selectingVertexForCard === 'treason_place') {
                setSelectingVertexForCard(null);
            }
            return;
        }

        setIsTreasonModalOpen(true);
            if (treasonEffect.stage === 'awaiting_knight') {
                setTreasonSelectedPlacementVertexId(null);
                if (isTreasonTarget) {
                    setTreasonMode('select_knight');
                    setSelectingVertexForCard('treason_remove');
                } else if (isTreasonInitiator) {
                setTreasonMode('waiting_for_knight');
                if (selectingVertexForCard === 'treason_remove' || selectingVertexForCard === 'treason_place') {
                    setSelectingVertexForCard(null);
                }
            } else {
                setTreasonMode('waiting_for_knight');
            }
        } else if (treasonEffect.stage === 'awaiting_placement') {
            setTreasonSelectedKnightId(null);
            setTreasonSelectedPlacementVertexId(null);
            if (isTreasonInitiator) {
                setTreasonMode('place_knight');
                setSelectingVertexForCard('treason_place');
                setSelectingEdgeForCard(null);
                setSelectingHexForCard(null);
                setBuildMode(null);
                setMovingKnightId(null);
                setBuildingMetropolisType(null);
                setIsTreasonModalOpen(true);
            } else {
                // Target is done once they remove a knight
                resetTreasonLocalState();
                setSelectingVertexForCard(prev => (prev === 'treason_remove' || prev === 'treason_place' ? null : prev));
            }
        }
    }, [isTreasonInitiator, isTreasonTarget, selectingVertexForCard, treasonEffect, treasonMode]);

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
        if (treasonMode === 'waiting_for_knight' && treasonTargetId) {
            const targetName = gameState.players.find(p => p.id === treasonTargetId)?.name || 'opponent';
            return `Waiting for ${targetName} to remove a knight.`;
        }
        if (treasonMode === 'select_knight') {
            return treasonSelectedKnightId ? 'Selected knight. Click Remove to continue.' : 'Click one of your knights to remove it.';
        }
        if (treasonMode === 'place_knight') {
            if (!treasonSupplyAvailable) {
                return `No ${treasonEffectLevel || ''} knight pieces remain in your supply. Resolve to end Treason without placement.`;
            }
            if (!treasonHasLegalPlacement) {
                return 'No legal intersections connected to your roads. Resolve to end Treason without placement.';
            }
            return treasonSelectedPlacementVertexId
                ? 'Selected intersection. Click Place to finish.'
                : 'Click an empty intersection connected to your roads.';
        }
        return undefined;
    })();

    const showTreasonPlacePrompt =
        treasonMode === 'place_knight' &&
        selectingVertexForCard === 'treason_place' &&
        treasonSupplyAvailable &&
        treasonHasLegalPlacement;
    const showTreasonModal =
        isTreasonModalOpen &&
        treasonMode &&
        (treasonMode !== 'place_knight' || !treasonSupplyAvailable || !treasonHasLegalPlacement);


    const handleEndTurnClick = async () => {
        const cardCount = currentPlayer?.progressCards?.length ?? 0;
        if (isCitiesAndKnights && cardCount > 4) {
            setProgressDiscardContext('own_turn');
            setShowProgressCardDiscard(true);
            return;
        }

        await endTurn(roomId, playerId);
    };

    const activeProgressCard: ProgressCardType | 'metropolis' | null = (() => {
        if (showRoadBuildingPrompt) return 'road_building_progress';
        if (showEngineeringPrompt) return 'engineer';
        if (selectingHexForCard) return selectingHexForCard;
        if (selectingVertexForCard === 'intrigue') return 'intrigue';
        if (selectingVertexForCard === 'treason_remove' || selectingVertexForCard === 'treason_place') return 'treason';
        if (selectingEdgeForCard) return selectingEdgeForCard;
        if (selectingKnightsForSmith) return 'smith';
        if (selectingCityForMedicine) return 'medicine';
        if (selectingCityForEngineer) return 'engineer';
        if (selectingCityForMetropolis) return 'metropolis';
        if (isCraneDialogOpen) return 'crane';
        if (treasonMode) return 'treason';
        if (selectedProgressCard) return selectedProgressCard;
        return null;
    })();
    const promptBlocksUI =
        showRoadBuildingPrompt ||
        showEngineeringPrompt ||
        showDiplomatPrompt ||
        showIntriguePrompt ||
        treasonMode === 'select_knight' ||
        treasonMode === 'place_knight';
    const engineerSelectionActive = showEngineeringPrompt || selectingCityForEngineer;

    return (
        <div className="relative h-screen w-screen overflow-x-visible overflow-y-hidden">
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
                selectedEngineerCityId={selectedEngineerCityId}
                selectingCityForMedicine={selectingCityForMedicine}
                selectingCityForMetropolis={selectingCityForMetropolis}
                selectedMetropolisCityId={selectedMetropolisCityId}
                intrigueSelectedKnightId={intrigueTarget?.knightId ?? null}
                selectingKnightsForSmith={selectingKnightsForSmith}
                smithSelectableKnightIds={smithEligibleVertexIds}
                smithSelectedKnightIds={selectedSmithKnightIds}
                treasonSelectedKnightId={treasonSelectedKnightId}
                treasonSelectedPlacementVertexId={treasonSelectedPlacementVertexId}
                progressPromptCardType={showRoadBuildingPrompt ? 'road_building_progress' : null}
                progressPromptVisible={showRoadBuildingPrompt}
                progressPromptReady={isRoadBuildingProgressActive}
                inventorSelection={inventorSelection}
                merchantSelectedHexId={selectedMerchantHexId}
                taxationSelectedHexId={selectedTaxationHexId}
                diplomatStage={diplomatStage}
                diplomatRemovedEdgeId={diplomatStage === 'rebuild' ? diplomatSelectedEdgeId : null}
                diplomatRelocatedEdgeId={diplomatRelocateEdgeId}
                onHexSelected={handleHexSelected}
                onVertexSelectedForCard={handleVertexSelected}
                onEdgeSelectedForCard={handleEdgeSelected}
                onEngineerCitySelected={handleEngineerCitySelected}
                onMedicineCitySelected={handleMedicineCitySelected}
                onMetropolisCitySelected={handleMetropolisCitySelected}
                onCityClick={handleCityClick}
                onKnightClick={handleKnightClick}
                onBarbarianCitySelect={handleLoseCityToBarbarians}
            />

            {showIntriguePrompt && (
                <BoardSelectionPrompt
                    title="Intrigue"
                    description="Select an opponent knight adjacent to your road network."
                    status={intriguePromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={handleConfirmIntrigueDisplacement}
                    finishLabel="Displace"
                    finishDisabled={!intrigueTarget || isSubmittingIntrigue}
                />
            )}

            {showTreasonPlacePrompt && (
                <BoardSelectionPrompt
                    title="Treason"
                    description="Place the captured knight on any empty intersection connected to your roads."
                    status={treasonStatus}
                    onCancel={handleCancelTreasonPlacement}
                    onFinish={handleConfirmTreasonPlacement}
                    finishLabel="Place"
                    finishDisabled={!treasonSelectedPlacementVertexId || isSubmittingTreason}
                />
            )}

            {showMerchantModal && (
                <MerchantPlacementModal
                    isOpen={showMerchantModal}
                    selectedResource={selectedMerchantResource}
                    status={merchantPrompt.status}
                    error={merchantError}
                    onCancel={handleCancelSelection}
                    onPlace={handleConfirmMerchantPlacement}
                />
            )}

            {showTreasonModal && (
                <TreasonPlacementModal
                    isOpen={showTreasonModal}
                    mode={treasonMode}
                    opponents={treasonOpponents}
                    selectedOpponentId={treasonSelectedOpponentId}
                    initiatorName={treasonInitiatorName}
                    status={treasonStatus}
                    error={treasonError}
                    hasSelection={
                        treasonMode === 'select_opponent'
                            ? !!treasonSelectedOpponentId
                            : treasonMode === 'select_knight'
                                ? !!treasonSelectedKnightId
                                : treasonMode === 'place_knight'
                                    ? (treasonSupplyAvailable && treasonHasLegalPlacement
                                        ? !!treasonSelectedPlacementVertexId
                                        : true)
                                    : false
                    }
                    onSelectOpponent={
                        treasonMode === 'select_opponent'
                            ? (id) => {
                                setTreasonSelectedOpponentId(prev => (prev === id ? null : id));
                                setTreasonError(null);
                            }
                            : undefined
                    }
                    onConfirm={
                        treasonMode === 'select_opponent'
                            ? handleConfirmTreasonOpponent
                            : treasonMode === 'select_knight'
                                ? handleConfirmTreasonKnightRemoval
                                : treasonMode === 'place_knight'
                                    ? handleConfirmTreasonPlacement
                                    : undefined
                    }
                    confirmLabel={
                        treasonMode === 'select_opponent'
                            ? 'Confirm'
                            : treasonMode === 'select_knight'
                                ? 'Remove'
                                : treasonMode === 'place_knight'
                                    ? (treasonSupplyAvailable && treasonHasLegalPlacement ? 'Place' : 'Resolve')
                                    : undefined
                    }
                    disableConfirm={isSubmittingTreason}
                    onCancel={
                        treasonMode === 'select_opponent'
                            ? () => resetTreasonLocalState()
                            : treasonMode === 'place_knight'
                                ? handleCancelTreasonPlacement
                                : undefined
                    }
                />
            )}

            {showTaxationModal && (
                <TaxationPlacementModal
                    isOpen={showTaxationModal}
                    status={taxationPromptStatus}
                    error={taxationError}
                    hasSelection={!!selectedTaxationHexId}
                    onCancel={handleCancelSelection}
                    onPlace={handleConfirmTaxationPlacement}
                />
            )}

            {showEngineeringPrompt && (
                <BoardSelectionPrompt
                    title="Engineering"
                    description="Click one of your cities without a wall to add a free city wall."
                    status={engineeringPromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={handleConfirmEngineerBuild}
                    finishLabel="Build"
                    finishDisabled={!selectedEngineerCityId || isEngineerSubmitting}
                />
            )}

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

            {showDiplomatPrompt && (
                <BoardSelectionPrompt
                    title="Diplomat"
                    description={diplomatStage === 'rebuild' ? 'Place your moved road on any legal edge.' : 'Select an open road to remove.'}
                    status={diplomatPromptStatus}
                    onCancel={handleCancelSelection}
                    onFinish={diplomatStage === 'rebuild' ? handleConfirmDiplomatRebuild : handleConfirmDiplomatRemove}
                    finishLabel={diplomatStage === 'rebuild' ? 'Rebuild' : 'Remove'}
                    finishDisabled={
                        isSubmittingDiplomat ||
                        (diplomatStage === 'rebuild' ? !diplomatRelocateEdgeId : !diplomatSelectedEdgeId)
                    }
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

            {/* Metropolis Selection Prompt (C&K) - No cancel, must select a city */}
            {selectingCityForMetropolis && metropolisPrompt.isVisible && (
                <BoardSelectionPrompt
                    title={`${selectingCityForMetropolis === 'science' ? 'Science' : selectingCityForMetropolis === 'trade' ? 'Trade' : 'Politics'} Metropolis`}
                    description={`You must select one of your cities to upgrade to a ${selectingCityForMetropolis === 'science' ? 'Science' : selectingCityForMetropolis === 'trade' ? 'Trade' : 'Politics'} Metropolis.`}
                    status={metropolisPrompt.status || 'Select a city to upgrade to Metropolis.'}
                    onFinish={handleConfirmMetropolisBuild}
                    finishLabel="Confirm"
                    finishDisabled={!selectedMetropolisCityId || isMetropolisSubmitting}
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

                {/* Left Sidebar: Game Log & Debug Panel */}
                {/* Positioned below Map Controls (approx top-20) */}
                <div className="absolute top-48 left-4 bottom-36 w-80 flex flex-col gap-4 pointer-events-auto z-30">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <GameLog logs={gameState.logs || []} />
                    </div>
                    {/* Debug Panel */}
                    {isDebugMode && currentPlayer && (
                        <DebugPanel player={currentPlayer} roomId={roomId} />
                    )}
                </div>

                {/* Right Sidebar: Status + C&K Components */}
                <div className="absolute top-4 right-4 w-80 flex flex-col gap-4 pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-visible">
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
                                    onStartTreasonSelection={handleStartTreasonSelection}
                                    isActiveTurn={isActiveTurn}
                                    isEngineerSelecting={engineerSelectionActive}
                                    isSmithSelecting={selectingKnightsForSmith}
                                    isMedicineSelecting={selectingCityForMedicine}
                                    activeFollowupCard={activeProgressCard === 'metropolis' ? null : activeProgressCard}
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
