import { GameState } from '@/lib/types';
import { SelectionState, ImprovementType } from '@/lib/hooks/useSelectionManager';
import { ProgressPrompt } from './improvement-controller';
import { getEligibleCityWallVertices } from '@/core/utils/city-wall-utils';
import { getCanonicalVertexId } from '@/lib/hex';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import {
  endTurn,
  playProgressCard,
  cancelRoadBuildingProgress,
  finalizeRoadBuildingProgress,
  selectTreasonKnight,
  placeTreasonKnight,
  cancelTreason,
  discardProgressCards,
} from '@/app/actions';

/**
 * Progress Card Controller
 * Handles all progress card interactions including hex/vertex/edge selection flows
 * Extracted from GameController.tsx to improve separation of concerns
 */

export interface ProgressCardControllerDeps {
  roomId: string;
  playerId: string;
  gameState: GameState | null;
  selectionManager: SelectionState;
  merchantPrompt: ProgressPrompt;
  inventorPrompt: ProgressPrompt;
  taxationPrompt: ProgressPrompt;
  engineeringPrompt: ProgressPrompt;
  medicinePrompt: ProgressPrompt;
  roadBuildingPrompt: ProgressPrompt & { hide: () => void };
  getOptimisticState: (state: GameState) => GameState;
  clearSelectedCard: () => void;
  isActiveTurn: boolean;
  treasonEffect: any;
  isTreasonTarget: boolean;
  resetTreasonLocalState: (keepModal?: boolean) => void;
  isRoadBuildingProgressActive: boolean;
  progressDiscardContext: 'own_turn' | 'other_turn';
  setShowProgressCardDiscard: (show: boolean) => void;
  setProgressDiscardContext: (context: 'own_turn' | 'other_turn') => void;
  onGameStateUpdated: (state: GameState) => void;
}

export interface ProgressCardController {
  // Main card handler
  handlePlayProgressCard: (cardType: any, options?: any) => Promise<void>;

  // Hex selection (merchant, inventor, taxation)
  handleStartHexSelection: (cardType: 'merchant' | 'inventor' | 'taxation') => void;
  handleHexSelected: (hexId: string) => Promise<void>;
  handleConfirmInventorSwap: () => Promise<void>;
  handleConfirmMerchantPlacement: () => Promise<void>;
  handleConfirmTaxationPlacement: () => Promise<void>;

  // Vertex selection (intrigue, treason)
  handleStartVertexSelection: (cardType: 'intrigue') => void;
  handleVertexSelected: (vertexId: string) => Promise<void>;
  handleConfirmIntrigueDisplacement: () => Promise<void>;

  // Edge selection (diplomat)
  handleStartEdgeSelection: (cardType: 'diplomat') => void;
  handleEdgeSelected: (edgeId: string) => void;
  handleConfirmDiplomatRemove: () => Promise<void>;
  handleConfirmDiplomatRebuild: () => Promise<void>;

  // Engineer card
  handleStartEngineerSelection: () => void;
  handleEngineerCitySelected: (vertexId: string) => void;
  handleConfirmEngineerBuild: () => Promise<void>;

  // Medicine card
  handleStartMedicineSelection: () => void;
  handleMedicineCitySelected: (vertexId: string) => void;
  handleConfirmMedicineBuild: () => Promise<void>;

  // Treason card
  handleStartTreasonSelection: () => void;
  handleConfirmTreasonOpponent: () => Promise<void>;
  handleConfirmTreasonKnightRemoval: () => Promise<void>;
  handleConfirmTreasonPlacement: () => Promise<void>;
  handleCancelTreasonPlacement: () => Promise<void>;

  // Road building card
  handleCancelRoadBuildingProgress: () => Promise<void>;
  handleFinalizeRoadBuildingProgress: () => Promise<void>;

  // General
  handleCancelFollowupCard: () => void;
  handleDiscardProgressCards: (cardsToDiscard: any[]) => Promise<void>;
}

/** Utility to map terrain to resource */
const resourceForTerrain = (terrain: TerrainType): ResourceType | null => {
  switch (terrain) {
    case 'forest': return 'wood';
    case 'hill': return 'brick';
    case 'pasture': return 'sheep';
    case 'field': return 'wheat';
    case 'mountain': return 'ore';
    default: return null;
  }
};

export function createProgressCardController(deps: ProgressCardControllerDeps): ProgressCardController {
  const {
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
    onGameStateUpdated,
  } = deps;

  /**
   * Main progress card play handler
   */
  const handlePlayProgressCard = async (cardType: any, options?: any) => {
    try {
      if (cardType === 'road_building_progress') {
        roadBuildingPrompt.begin();
      }
      const updatedGameState = await playProgressCard(roomId, playerId, cardType, options || {});
      onGameStateUpdated(updatedGameState);
    } catch (e: any) {
      if (cardType === 'road_building_progress') {
        roadBuildingPrompt.clear();
      }
      console.error('Error playing progress card:', e);
      throw e;
    }
  };

  // ==================== HEX SELECTION CARDS ====================

  const handleStartHexSelection = (cardType: 'merchant' | 'inventor' | 'taxation') => {
    if (selectionManager.selectingHexForCard === cardType) {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.clearAllSelections();

    if (cardType === 'merchant') {
      selectionManager.setSelectingHexForCard('merchant');
      selectionManager.setIsMerchantModalOpen(true);
      selectionManager.setSelectedMerchantHexId(null);
      selectionManager.setMerchantError(null);
      merchantPrompt.begin('Select a resource hex.');
      selectionManager.setBuildMode(null);
      selectionManager.setMovingKnightId(null);
      selectionManager.setBuildingMetropolisType(null);
      return;
    }

    if (cardType === 'taxation') {
      selectionManager.setSelectingHexForCard('taxation');
      selectionManager.setIsTaxationModalOpen(true);
      selectionManager.setSelectedTaxationHexId(null);
      selectionManager.setTaxationError(null);
      taxationPrompt.begin('Select a hex to move the robber.');
      selectionManager.setBuildMode(null);
      selectionManager.setMovingKnightId(null);
      selectionManager.setBuildingMetropolisType(null);
      return;
    }

    if (cardType === 'inventor') {
      selectionManager.setSelectingHexForCard('inventor');
      selectionManager.setInventorSelection({});
      selectionManager.setInventorError(null);
      selectionManager.setIsInventorConfirmOpen(false);
      inventorPrompt.begin('Select first hex with a number token to swap.');
      selectionManager.setBuildMode(null);
      selectionManager.setMovingKnightId(null);
      selectionManager.setBuildingMetropolisType(null);
      return;
    }

    selectionManager.setSelectingHexForCard(cardType);
    selectionManager.setBuildMode(null);
    selectionManager.setMovingKnightId(null);
    selectionManager.setBuildingMetropolisType(null);
  };

  const handleHexSelected = async (hexId: string) => {
    if (!selectionManager.selectingHexForCard || !gameState) return;

    // Handle multi-step selection (e.g. Inventor needs 2 hexes)
    if (selectionManager.selectingHexForCard === 'inventor') {
      if (selectionManager.isInventorConfirmOpen) return;

      const selectedHex = gameState.board.hexes.find(h => h.id === hexId);
      const tokenValue = selectedHex?.numberToken;
      if (!selectedHex || !tokenValue) return;

      const inventorSelection = selectionManager.inventorSelection;

      // First selection or reselection
      if (!inventorSelection.firstHexId || inventorSelection.firstHexId === hexId) {
        selectionManager.setInventorSelection({ firstHexId: hexId, firstValue: tokenValue });
        selectionManager.setInventorError(null);
        inventorPrompt.setStatus(`Selected #${tokenValue}. Click another hex to swap.`);
        return;
      }

      // Second selection (must be different)
      if (inventorSelection.firstHexId === hexId) return;

      selectionManager.setInventorSelection({ ...inventorSelection, secondHexId: hexId, secondValue: tokenValue });
      selectionManager.setInventorError(null);
      inventorPrompt.setStatus(`Swapping #${inventorSelection.firstValue} with #${tokenValue}`);
      selectionManager.setIsInventorConfirmOpen(true);
      return;
    }

    if (selectionManager.selectingHexForCard === 'merchant') {
      selectionManager.setSelectedMerchantHexId(hexId);
      selectionManager.setMerchantError(null);

      const selectedHex = gameState.board.hexes.find(h => h.id === hexId);
      const resource = selectedHex ? resourceForTerrain(selectedHex.terrain) : null;
      const resourceStatus = resource ? `Selected ${resource}.` : 'Select a resource hex.';
      merchantPrompt.setStatus(resourceStatus);
      return;
    }

    if (selectionManager.selectingHexForCard === 'taxation') {
      selectionManager.setSelectedTaxationHexId(hexId);
      selectionManager.setTaxationError(null);

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
    await handlePlayProgressCard(selectionManager.selectingHexForCard, { hexId });
    selectionManager.setSelectingHexForCard(null);
  };

  const handleConfirmInventorSwap = async () => {
    const { firstHexId, secondHexId } = selectionManager.inventorSelection;
    if (!firstHexId || !secondHexId) return;
    try {
      await handlePlayProgressCard('inventor', {
        hex1Id: firstHexId,
        hex2Id: secondHexId
      });
      selectionManager.setIsInventorConfirmOpen(false);
      selectionManager.setInventorSelection({});
      selectionManager.clearAllSelections();
    } catch (e: any) {
      const message = e?.message || 'Failed to swap number tokens';
      selectionManager.setInventorError(message);
    }
  };

  const handleConfirmMerchantPlacement = async () => {
    if (!selectionManager.selectedMerchantHexId) return;
    selectionManager.setMerchantError(null);
    merchantPrompt.setStatus('Placing Merchant...');
    try {
      await handlePlayProgressCard('merchant', { hexId: selectionManager.selectedMerchantHexId });
      merchantPrompt.clear();
      selectionManager.clearAllSelections();
    } catch (e: any) {
      const message = e?.message || 'Failed to place Merchant';
      selectionManager.setMerchantError(message);
      merchantPrompt.setStatus(message);
    }
  };

  const handleConfirmTaxationPlacement = async () => {
    if (!selectionManager.selectedTaxationHexId) return;
    selectionManager.setTaxationError(null);
    taxationPrompt.setStatus('Moving robber and stealing...');
    try {
      await handlePlayProgressCard('taxation', { hexId: selectionManager.selectedTaxationHexId });
      taxationPrompt.clear();
      selectionManager.clearAllSelections();
    } catch (e: any) {
      const message = e?.message || 'Failed to resolve Taxation';
      selectionManager.setTaxationError(message);
      taxationPrompt.setStatus(message);
    }
  };

  // ==================== VERTEX SELECTION CARDS ====================

  const handleStartVertexSelection = (cardType: 'intrigue') => {
    if (selectionManager.selectingVertexForCard === cardType) {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.clearAllSelections();
    selectionManager.setSelectingVertexForCard(cardType);
    selectionManager.setBuildMode(null);
    selectionManager.setMovingKnightId(null);
    selectionManager.setBuildingMetropolisType(null);
  };

  const handleVertexSelected = async (vertexId: string) => {
    if (!selectionManager.selectingVertexForCard) return;

    if (selectionManager.selectingVertexForCard === 'treason_remove') {
      const knightAtVertex = gameState?.players
        .flatMap(p => p.knights || [])
        .find(k => k.vertexId === vertexId);

      if (!knightAtVertex || knightAtVertex.playerId !== playerId) {
        selectionManager.setTreasonError('Select one of your knights to remove.');
        selectionManager.setTreasonSelectedKnightId(null);
        return;
      }

      selectionManager.setTreasonError(null);
      const prevId = selectionManager.treasonSelectedKnightId;
      selectionManager.setTreasonSelectedKnightId(prevId === knightAtVertex.id ? null : knightAtVertex.id);
      return;
    }

    if (selectionManager.selectingVertexForCard === 'treason_place') {
      selectionManager.setTreasonError(null);
      const prevId = selectionManager.treasonSelectedPlacementVertexId;
      selectionManager.setTreasonSelectedPlacementVertexId(prevId === vertexId ? null : vertexId);
      return;
    }

    if (selectionManager.selectingVertexForCard === 'intrigue') {
      const targetPlayer = gameState?.players.find(p => (p.knights || []).some(k => k.vertexId === vertexId));
      const targetKnight = targetPlayer?.knights?.find(k => k.vertexId === vertexId);

      if (!targetPlayer || !targetKnight || targetPlayer.id === playerId) {
        selectionManager.setIntrigueError('Select an opponent knight adjacent to your roads.');
        selectionManager.setIntrigueTarget(null);
        return;
      }

      selectionManager.setIntrigueError(null);
      const prev = selectionManager.intrigueTarget;
      if (prev?.knightId === targetKnight.id) {
        selectionManager.setIntrigueTarget(null);
      } else {
        selectionManager.setIntrigueTarget({
          knightId: targetKnight.id,
          opponentId: targetPlayer.id,
          vertexId
        });
      }
      return;
    }

    selectionManager.setSelectingVertexForCard(null);
  };

  const handleConfirmIntrigueDisplacement = async () => {
    if (!selectionManager.intrigueTarget) return;
    selectionManager.setIsSubmittingIntrigue(true);
    try {
      await handlePlayProgressCard('intrigue', {
        opponentId: selectionManager.intrigueTarget.opponentId,
        knightId: selectionManager.intrigueTarget.knightId
      });
      selectionManager.clearAllSelections();
    } catch (e: any) {
      selectionManager.setIntrigueError(e?.message || 'Failed to displace knight');
    } finally {
      selectionManager.setIsSubmittingIntrigue(false);
    }
  };

  // ==================== EDGE SELECTION CARDS ====================

  const handleStartEdgeSelection = (cardType: 'diplomat') => {
    if (selectionManager.selectingEdgeForCard === cardType) {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.clearAllSelections();
    selectionManager.setSelectingEdgeForCard(cardType);
    selectionManager.setDiplomatStage('remove');
    selectionManager.setBuildMode(null);
    selectionManager.setMovingKnightId(null);
    selectionManager.setBuildingMetropolisType(null);
  };

  const handleEdgeSelected = (edgeId: string) => {
    if (!selectionManager.selectingEdgeForCard || selectionManager.selectingEdgeForCard !== 'diplomat') return;

    // Stage: selecting a road to remove
    if (selectionManager.diplomatStage !== 'rebuild') {
      const edge = gameState?.board.edges[edgeId];
      selectionManager.setDiplomatSelectedEdgeId(edgeId);
      selectionManager.setDiplomatSelectedEdgeOwner(edge?.owner ?? null);
      selectionManager.setDiplomatError(null);
      return;
    }

    // Stage: selecting where to rebuild
    selectionManager.setDiplomatRelocateEdgeId(edgeId);
    selectionManager.setDiplomatError(null);
  };

  const handleConfirmDiplomatRemove = async () => {
    if (!selectionManager.diplomatSelectedEdgeId || selectionManager.diplomatStage !== 'remove') return;
    selectionManager.setIsSubmittingDiplomat(true);
    try {
      if (selectionManager.diplomatSelectedEdgeOwner && selectionManager.diplomatSelectedEdgeOwner !== playerId) {
        await handlePlayProgressCard('diplomat', { edgeId: selectionManager.diplomatSelectedEdgeId });
        selectionManager.clearAllSelections();
        return;
      }

      if (selectionManager.diplomatSelectedEdgeOwner === playerId) {
        selectionManager.setDiplomatStage('rebuild');
        selectionManager.setDiplomatRelocateEdgeId(null);
        selectionManager.setDiplomatError(null);
        return;
      }

      selectionManager.setDiplomatError('Select an open road to remove.');
    } catch (e: any) {
      selectionManager.setDiplomatError(e?.message || 'Failed to resolve Diplomat');
    } finally {
      selectionManager.setIsSubmittingDiplomat(false);
    }
  };

  const handleConfirmDiplomatRebuild = async () => {
    if (selectionManager.diplomatStage !== 'rebuild' || !selectionManager.diplomatSelectedEdgeId || !selectionManager.diplomatRelocateEdgeId) return;
    selectionManager.setIsSubmittingDiplomat(true);
    try {
      await handlePlayProgressCard('diplomat', {
        edgeId: selectionManager.diplomatSelectedEdgeId,
        newEdgeId: selectionManager.diplomatRelocateEdgeId
      });
      selectionManager.clearAllSelections();
    } catch (e: any) {
      selectionManager.setDiplomatError(e?.message || 'Failed to rebuild road with Diplomat');
    } finally {
      selectionManager.setIsSubmittingDiplomat(false);
    }
  };

  // ==================== ENGINEER CARD ====================

  const handleStartEngineerSelection = () => {
    if (!gameState || !isActiveTurn) return;
    const effectiveState = getOptimisticState(gameState);
    const eligible = getEligibleCityWallVertices(effectiveState, playerId, { ignoreCost: true });
    if (eligible.length === 0) return;
    if (selectionManager.selectingCityForEngineer) {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.clearAllSelections();
    selectionManager.setSelectedEngineerCityId(null);
    engineeringPrompt.begin('Select a city without a wall for Engineering');
    selectionManager.setSelectingCityForEngineer(true);
  };

  const handleEngineerCitySelected = (vertexId: string) => {
    if (selectionManager.isEngineerSubmitting) return;
    if (selectionManager.selectedEngineerCityId === vertexId) {
      selectionManager.setSelectedEngineerCityId(null);
      engineeringPrompt.setStatus('Select a city without a wall for Engineering');
      return;
    }
    selectionManager.setSelectedEngineerCityId(vertexId);
    engineeringPrompt.setStatus('City selected. Click Build to confirm.');
  };

  const handleConfirmEngineerBuild = async () => {
    if (!selectionManager.selectedEngineerCityId) return;
    selectionManager.setIsEngineerSubmitting(true);
    engineeringPrompt.setStatus('Building city wall...');
    try {
      await handlePlayProgressCard('engineer', { vertexId: selectionManager.selectedEngineerCityId });
      selectionManager.setSelectingCityForEngineer(false);
      selectionManager.setSelectedEngineerCityId(null);
      engineeringPrompt.clear();
      clearSelectedCard();
    } catch (e: any) {
      const message = e?.message || 'Failed to build city wall with Engineering';
      engineeringPrompt.setStatus(message);
      console.error('Failed to build city wall with Engineering', e);
    } finally {
      selectionManager.setIsEngineerSubmitting(false);
    }
  };

  // ==================== MEDICINE CARD ====================

  const MEDICINE_COST = { ore: 2, wheat: 1 } as const;

  const handleStartMedicineSelection = () => {
    if (!gameState) return;
    const effectiveState = getOptimisticState(gameState);
    const player = effectiveState.players.find(p => p.id === playerId);

    const hasResources =
      !!player &&
      (player.resources.ore ?? 0) >= MEDICINE_COST.ore &&
      (player.resources.wheat ?? 0) >= MEDICINE_COST.wheat;
    const hasCityToken = (player?.citiesRemaining ?? 0) > 0;
    const eligibleSettlements = gameState ? Object.values(gameState.board.vertices).filter(v =>
      v.owner === playerId && v.structure === 'settlement'
    ) : [];

    if (!hasResources || !hasCityToken || eligibleSettlements.length === 0) return;

    if (selectionManager.selectingCityForMedicine) {
      selectionManager.clearAllSelections();
      return;
    }

    selectionManager.clearAllSelections();
    selectionManager.setSelectedMedicineCityId(null);
    medicinePrompt.begin('Select a settlement to upgrade to a city.');
    selectionManager.setSelectingCityForMedicine(true);
  };

  const handleMedicineCitySelected = (vertexId: string) => {
    if (selectionManager.isSubmittingMedicine) return;
    if (selectionManager.selectedMedicineCityId === vertexId) {
      selectionManager.setSelectedMedicineCityId(null);
      medicinePrompt.setStatus('Select a settlement to upgrade to a city.');
      return;
    }
    selectionManager.setSelectedMedicineCityId(vertexId);
    medicinePrompt.setStatus('Settlement selected. Click Upgrade to confirm.');
  };

  const handleConfirmMedicineBuild = async () => {
    if (!selectionManager.selectedMedicineCityId) return;
    selectionManager.setIsSubmittingMedicine(true);
    medicinePrompt.setStatus('Upgrading settlement to city...');
    try {
      await handlePlayProgressCard('medicine', { vertexId: selectionManager.selectedMedicineCityId });
      selectionManager.setSelectingCityForMedicine(false);
      selectionManager.setSelectedMedicineCityId(null);
      medicinePrompt.clear();
      clearSelectedCard();
    } catch (e: any) {
      const message = e?.message || 'Failed to upgrade settlement with Medicine';
      medicinePrompt.setStatus(message);
      console.error('Failed to upgrade settlement with Medicine', e);
    } finally {
      selectionManager.setIsSubmittingMedicine(false);
    }
  };

  // ==================== TREASON CARD ====================

  const handleStartTreasonSelection = () => {
    selectionManager.setIsTreasonModalOpen(true);
    selectionManager.setTreasonMode('select_opponent');
    selectionManager.setTreasonSelectedOpponentId(null);
    selectionManager.setTreasonSelectedKnightId(null);
    selectionManager.setTreasonSelectedPlacementVertexId(null);
    selectionManager.setTreasonError(null);
  };

  const handleConfirmTreasonOpponent = async () => {
    if (!selectionManager.treasonSelectedOpponentId) {
      selectionManager.setTreasonError('Select an opponent with at least one knight.');
      return;
    }
    selectionManager.setIsSubmittingTreason(true);
    selectionManager.setTreasonError(null);
    try {
      await handlePlayProgressCard('treason', { opponentId: selectionManager.treasonSelectedOpponentId });
      selectionManager.setTreasonMode('waiting_for_knight');
    } catch (e: any) {
      selectionManager.setTreasonError(e?.message || 'Failed to start Treason');
    } finally {
      selectionManager.setIsSubmittingTreason(false);
    }
  };

  const handleConfirmTreasonKnightRemoval = async () => {
    if (!selectionManager.treasonSelectedKnightId) {
      selectionManager.setTreasonError('Select a knight to remove.');
      return;
    }
    selectionManager.setIsSubmittingTreason(true);
    selectionManager.setTreasonError(null);
    try {
      await selectTreasonKnight(roomId, playerId, selectionManager.treasonSelectedKnightId);
      // Target is done after removing their knight
      if (isTreasonTarget) {
        resetTreasonLocalState();
        selectionManager.setSelectingVertexForCard(
          selectionManager.selectingVertexForCard === 'treason_remove' ? null : selectionManager.selectingVertexForCard
        );
      }
    } catch (e: any) {
      selectionManager.setTreasonError(e?.message || 'Failed to remove knight');
    } finally {
      selectionManager.setIsSubmittingTreason(false);
    }
  };

  const handleConfirmTreasonPlacement = async () => {
    // Note: treasonSupplyAvailable and treasonHasLegalPlacement need to be passed as deps or calculated here
    // For now, assuming they're part of gameState or need to be calculated
    const chosenVertex = selectionManager.treasonSelectedPlacementVertexId;

    selectionManager.setIsSubmittingTreason(true);
    selectionManager.setTreasonError(null);
    try {
      await placeTreasonKnight(roomId, playerId, chosenVertex ?? null);
      resetTreasonLocalState();
      selectionManager.setSelectingVertexForCard(
        selectionManager.selectingVertexForCard === 'treason_place' ? null : selectionManager.selectingVertexForCard
      );
    } catch (e: any) {
      selectionManager.setTreasonError(e?.message || 'Failed to place knight');
    } finally {
      selectionManager.setIsSubmittingTreason(false);
    }
  };

  const handleCancelTreasonPlacement = async () => {
    if (selectionManager.treasonMode !== 'place_knight') {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.setIsSubmittingTreason(true);
    selectionManager.setTreasonError(null);
    try {
      await cancelTreason(roomId, playerId);
      selectionManager.clearAllSelections();
    } catch (e: any) {
      selectionManager.setTreasonError(e?.message || 'Failed to cancel Treason');
    } finally {
      selectionManager.setIsSubmittingTreason(false);
    }
  };

  // ==================== ROAD BUILDING CARD ====================

  const handleCancelRoadBuildingProgress = async () => {
    roadBuildingPrompt.hide();
    try {
      await cancelRoadBuildingProgress(roomId, playerId);
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
      await finalizeRoadBuildingProgress(roomId, playerId);
      clearSelectedCard();
      roadBuildingPrompt.clear();
    } catch (e) {
      console.error('Failed to finalize Road Building progress card', e);
      roadBuildingPrompt.clear();
    }
  };

  // ==================== GENERAL ====================

  const handleCancelFollowupCard = () => {
    if (isRoadBuildingProgressActive) {
      handleCancelRoadBuildingProgress();
      return;
    }
    selectionManager.clearAllSelections();
  };

  const handleDiscardProgressCards = async (cardsToDiscard: any[]) => {
    const shouldAutoEndTurn = progressDiscardContext === 'own_turn';

    try {
      await discardProgressCards(roomId, playerId, cardsToDiscard);

      if (shouldAutoEndTurn) {
        await endTurn(roomId, playerId);
      }

      setShowProgressCardDiscard(false);
      setProgressDiscardContext('own_turn');
    } catch (e) {
      console.error('Error discarding progress cards:', e);
      throw e;
    }
  };

  return {
    handlePlayProgressCard,
    handleStartHexSelection,
    handleHexSelected,
    handleConfirmInventorSwap,
    handleConfirmMerchantPlacement,
    handleConfirmTaxationPlacement,
    handleStartVertexSelection,
    handleVertexSelected,
    handleConfirmIntrigueDisplacement,
    handleStartEdgeSelection,
    handleEdgeSelected,
    handleConfirmDiplomatRemove,
    handleConfirmDiplomatRebuild,
    handleStartEngineerSelection,
    handleEngineerCitySelected,
    handleConfirmEngineerBuild,
    handleStartMedicineSelection,
    handleMedicineCitySelected,
    handleConfirmMedicineBuild,
    handleStartTreasonSelection,
    handleConfirmTreasonOpponent,
    handleConfirmTreasonKnightRemoval,
    handleConfirmTreasonPlacement,
    handleCancelTreasonPlacement,
    handleCancelRoadBuildingProgress,
    handleFinalizeRoadBuildingProgress,
    handleCancelFollowupCard,
    handleDiscardProgressCards,
  };
}
