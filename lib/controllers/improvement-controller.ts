import { GameState } from '@/lib/types';
import { SelectionState, ImprovementType } from '@/lib/hooks/useSelectionManager';
import { buildCityWall, buildCity } from '@/app/actions';

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
  handlePlayProgressCard: (cardType: any, options?: any) => Promise<void>;
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
        selectionManager.setSelectedCityId(null); // Close city management
        handleStartMetropolisSelection(improvement);
      }
    }
  };

  /**
   * Starts metropolis city selection mode
   */
  const handleStartMetropolisSelection = (improvement: ImprovementType) => {
    if (!gameState) return;
    const playerCities = Object.values(gameState.board.vertices).filter(v =>
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

      selectionManager.setSelectingCityForMetropolis(null);
      selectionManager.setSelectedMetropolisCityId(null);
      metropolisPrompt.clear();
    } catch (e: any) {
      const message = e?.message || 'Failed to upgrade to metropolis';
      metropolisPrompt.setStatus(message);
      console.error('Failed to upgrade to metropolis', e);
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
    await handlePlayProgressCard('crane', { improvement });
    selectionManager.setIsCraneDialogOpen(false);
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
