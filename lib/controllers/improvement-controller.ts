import type { GameState } from '@/lib/types';
import type { SelectionState, ImprovementType } from '@/lib/hooks/useSelectionManager';
import { buildCityWall, buildCity, placeMetropolis, upgradeImprovement } from '@/app/actions';
import { canSelectMetropolisCity } from '@/core/engine/metropolis/metropolis-manager';
import {
  controllerErrorMessage,
  type PlayProgressCard,
} from '@/lib/controllers/progress-card/types';

/**
 * Improvement Controller
 * Handles city improvements, metropolis building, city walls, and settlement upgrades
 * Extracted from GameController.tsx to improve separation of concerns
 */

export interface ProgressPrompt {
  begin: (message?: string) => void;
  setStatus: (message: string) => void;
  clear: () => void;
}

export interface ImprovementControllerDeps {
  roomId: string;
  playerId: string;
  gameState: GameState | null;
  selectionManager: SelectionState;
  metropolisPrompt: ProgressPrompt;
  handlePlayProgressCard: PlayProgressCard;
}

export interface ImprovementController {
  handleCityClick: (vertexId: string) => void;
  handleSettlementClick: (vertexId: string) => void;
  handleUpgradeImprovement: (improvement: ImprovementType) => Promise<void>;
  handleStartMetropolisSelection: (improvement: ImprovementType) => void;
  handleMetropolisCitySelected: (vertexId: string) => void;
  handleConfirmMetropolisBuild: () => Promise<void>;
  handleBuildMetropolis: (metropolisType: ImprovementType) => void;
  handleBuildCityWall: (vertexId: string) => Promise<void>;
  handleUpgradeSettlementToCity: (vertexId: string) => Promise<void>;
  handleStartCraneDialog: () => void;
  handleCraneUpgrade: (improvement: ImprovementType) => Promise<void>;
}

/**
 * Creates an improvement controller instance with all improvement-related handlers
 */
export function createImprovementController(deps: ImprovementControllerDeps): ImprovementController {
  const { roomId, playerId, gameState, selectionManager, metropolisPrompt, handlePlayProgressCard } = deps;

  /**
   * Handles city click on board - opens city management
   */
  const handleCityClick = (vertexId: string) => {
    selectionManager.setSelectedCityId(vertexId);
    selectionManager.setBuildMode(null);
  };

  /**
   * Handles settlement click on board - opens settlement management
   */
  const handleSettlementClick = (vertexId: string) => {
    selectionManager.setSelectedSettlementId(vertexId);
    selectionManager.setBuildMode(null);
  };

  /**
   * Upgrades a city improvement level (science/trade/politics)
   * Triggers metropolis selection if level 4/5 is reached
   */
  const handleUpgradeImprovement = async (improvement: ImprovementType) => {
    const updatedGameState = await upgradeImprovement(roomId, playerId, improvement);

    // The server response is authoritative. Do not infer the target from the
    // city that opened the management dialog or from object iteration order.
    if (canSelectMetropolisCity(updatedGameState, playerId, improvement)) {
      selectionManager.setSelectedCityId(null);
      startMetropolisSelection(improvement, updatedGameState);
    }
  };

  const startMetropolisSelection = (improvement: ImprovementType, state: GameState | null) => {
    if (!state) return;
    const playerCities = Object.values(state.board.vertices).filter(v =>
      v.owner === playerId && v.structure === 'city'
    );
    if (playerCities.length === 0) return;

    selectionManager.clearAllSelections();
    selectionManager.setSelectedMetropolisCityId(null);
    const improvementName = improvement === 'science' ? 'Science' : improvement === 'trade' ? 'Trade' : 'Politics';
    metropolisPrompt.begin(`Select a city to upgrade to ${improvementName} Metropolis`);
    selectionManager.setSelectingCityForMetropolis(improvement);
  };

  /**
   * Starts metropolis city selection mode
   */
  const handleStartMetropolisSelection = (improvement: ImprovementType) => {
    startMetropolisSelection(improvement, gameState);
  };

  /**
   * Handles city selection for metropolis
   */
  const handleMetropolisCitySelected = (vertexId: string) => {
    if (selectionManager.isMetropolisSubmitting) return;
    if (selectionManager.selectedMetropolisCityId === vertexId) {
      selectionManager.setSelectedMetropolisCityId(null);
      const improvement = selectionManager.selectingCityForMetropolis;
      const improvementName = improvement === 'science' ? 'Science' : improvement === 'trade' ? 'Trade' : 'Politics';
      metropolisPrompt.setStatus(`Select a city to upgrade to ${improvementName} Metropolis`);
      return;
    }
    selectionManager.setSelectedMetropolisCityId(vertexId);
    metropolisPrompt.setStatus('City selected. Click Confirm to upgrade to Metropolis.');
  };

  /**
   * Confirms metropolis build on selected city
   */
  const handleConfirmMetropolisBuild = async () => {
    const { selectedMetropolisCityId, selectingCityForMetropolis } = selectionManager;
    if (!selectedMetropolisCityId || !selectingCityForMetropolis) return;

    selectionManager.setIsMetropolisSubmitting(true);
    metropolisPrompt.setStatus('Upgrading to metropolis...');
    try {
      await placeMetropolis(roomId, playerId, selectedMetropolisCityId, selectingCityForMetropolis);
      selectionManager.setSelectingCityForMetropolis(null);
      selectionManager.setSelectedMetropolisCityId(null);
      metropolisPrompt.clear();
    } catch (error: unknown) {
      const message = controllerErrorMessage(error, 'Failed to upgrade to metropolis');
      metropolisPrompt.setStatus(message);
      console.error('Failed to upgrade to metropolis', error);
    } finally {
      selectionManager.setIsMetropolisSubmitting(false);
    }
  };

  /**
   * Enters metropolis building mode - player will click a city vertex
   * (This is used by BuildControls for direct metropolis building)
   */
  const handleBuildMetropolis = (metropolisType: ImprovementType) => {
    selectionManager.setBuildingMetropolisType(metropolisType);
    selectionManager.setBuildMode(null);
    selectionManager.setMovingKnightId(null);
  };

  /**
   * Builds a city wall on specified vertex
   */
  const handleBuildCityWall = async (vertexId: string) => {
    await buildCityWall(roomId, playerId, vertexId);
  };

  /**
   * Upgrades a settlement to a city
   */
  const handleUpgradeSettlementToCity = async (vertexId: string) => {
    await buildCity(roomId, playerId, vertexId);
  };

  /**
   * Opens/closes crane card dialog
   */
  const handleStartCraneDialog = () => {
    if (selectionManager.isCraneDialogOpen) {
      selectionManager.clearAllSelections();
      return;
    }
    selectionManager.clearAllSelections();
    selectionManager.setIsCraneDialogOpen(true);
  };

  /**
   * Uses crane card to upgrade an improvement for free
   */
  const handleCraneUpgrade = async (improvement: ImprovementType) => {
    const player = gameState?.players.find(p => p.id === playerId);
    const nextLevel = (player?.improvements?.[improvement] || 0) + 1;

    await handlePlayProgressCard('crane', { improvement });
    selectionManager.setIsCraneDialogOpen(false);

    // Crane can also reach a metropolis threshold. The card command only
    // applies the improvement; the player still chooses the city afterward.
    if (gameState && canSelectMetropolisCity(gameState, playerId, improvement, nextLevel)) {
      startMetropolisSelection(improvement, gameState);
    }
  };

  return {
    handleCityClick,
    handleSettlementClick,
    handleUpgradeImprovement,
    handleStartMetropolisSelection,
    handleMetropolisCitySelected,
    handleConfirmMetropolisBuild,
    handleBuildMetropolis,
    handleBuildCityWall,
    handleUpgradeSettlementToCity,
    handleStartCraneDialog,
    handleCraneUpgrade,
  };
}
