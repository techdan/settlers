import { GameState } from '@/lib/types';
import { SelectionState } from './useSelectionManager';
import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { getPromotableKnights } from '@/core/utils/knight-upgrade-utils';

type ProgressPromptView = {
  isVisible: boolean;
  status?: string;
};

interface ProgressCardUIParams {
  gameState: GameState | null;
  selectionManager: SelectionState;
  playerId: string;
  merchantPrompt: ProgressPromptView;
  inventorPrompt: ProgressPromptView;
  taxationPrompt: ProgressPromptView;
  engineeringPrompt: ProgressPromptView;
  medicinePrompt: ProgressPromptView;
  roadBuildingPrompt: ProgressPromptView;
  isActiveTurn: boolean;
}

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

export function useProgressCardUIState({
  gameState,
  selectionManager,
  playerId,
  merchantPrompt,
  inventorPrompt,
  taxationPrompt,
  engineeringPrompt,
  medicinePrompt,
  roadBuildingPrompt,
  isActiveTurn,
}: ProgressCardUIParams) {
  const showDiplomatPrompt =
    selectionManager.selectingEdgeForCard === 'diplomat' && selectionManager.diplomatStage !== null;
  const diplomatOwnerName =
    selectionManager.diplomatSelectedEdgeOwner && gameState
      ? gameState.players.find(p => p.id === selectionManager.diplomatSelectedEdgeOwner)?.name || 'Opponent'
      : null;
  const diplomatPromptStatus =
    selectionManager.diplomatError ||
    (selectionManager.diplomatStage === 'rebuild'
      ? selectionManager.diplomatRelocateEdgeId
        ? 'New road position selected. Click Rebuild to place it.'
        : 'Select a highlighted edge to rebuild your road.'
      : selectionManager.diplomatSelectedEdgeId
        ? selectionManager.diplomatSelectedEdgeOwner === playerId
          ? 'Selected your road. Remove to relocate it.'
          : `Selected ${diplomatOwnerName || 'an opponent'}'s road. Remove to return it.`
        : 'Click any highlighted open road to select it.');

  const intrigueTarget = selectionManager.intrigueTarget;
  const intrigueOpponent =
    intrigueTarget && gameState ? gameState.players.find(p => p.id === intrigueTarget.opponentId) : null;
  const intrigueSelectedKnight =
    intrigueOpponent && intrigueTarget
      ? (intrigueOpponent.knights || []).find(k => k.id === intrigueTarget.knightId)
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
  const showMedicinePrompt = medicinePrompt.isVisible && !!isActiveTurn;
  const medicinePromptStatus =
    medicinePrompt.status || 'Select a settlement to upgrade to a city (costs 2 ore + 1 wheat instead of normal cost).';
  const showRoadBuildingPrompt = roadBuildingPrompt.isVisible && !!isActiveTurn;
  const roadBuildingPromptStatus = roadBuildingPrompt.status || 'Place up to 2 roads for free on your network.';

  const smithEligibleVertexIds =
    gameState && selectionManager.selectingKnightsForSmith
      ? getPromotableKnights(gameState, playerId).map(k => k.vertexId)
      : [];

  const selectedMerchantHex =
    selectionManager.selectedMerchantHexId && gameState
      ? gameState.board.hexes.find(hex => hex.id === selectionManager.selectedMerchantHexId)
      : null;
  const selectedMerchantResource = selectedMerchantHex ? resourceForTerrain(selectedMerchantHex.terrain) : null;
  const showMerchantModal = selectionManager.isMerchantModalOpen && merchantPrompt.isVisible;
  const showInventorPrompt = inventorPrompt.isVisible && !!isActiveTurn;
  const inventorPromptStatus = (() => {
    if (inventorPrompt.status) return inventorPrompt.status;
    const inv = selectionManager.inventorSelection;
    if (inv.firstValue && inv.secondValue) {
      return `Swapping #${inv.firstValue} with #${inv.secondValue}`;
    }
    if (inv.firstValue) {
      return `Selected #${inv.firstValue}. Click another hex to swap.`;
    }
    return 'Select first hex with a number token to swap (not 2, 6, 8, or 12).';
  })();
  const showTaxationModal = selectionManager.isTaxationModalOpen && taxationPrompt.isVisible;
  const taxationPromptStatus =
    taxationPrompt.status || 'Select any land hex to move the robber and steal 1 card from each opponent on it.';

  return {
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
  };
}
