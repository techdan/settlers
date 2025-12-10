import { GameState } from '@/lib/types';
import { SelectionState } from '@/lib/hooks/useSelectionManager';
import { getPromotableKnights } from '@/core/utils/knight-upgrade-utils';
import { activateKnight, upgradeKnight, relocateKnight } from '@/app/actions';

/**
 * Knight Controller
 * Handles all knight-related actions: activation, movement, upgrades, and smith card
 * Extracted from GameController.tsx to improve separation of concerns
 */

export interface KnightControllerDeps {
  roomId: string;
  playerId: string;
  gameState: GameState | null;
  selectionManager: SelectionState;
  getOptimisticState: (state: GameState) => GameState;
  handlePlayProgressCard: (cardType: any, options?: any) => Promise<void>;
}

export interface KnightController {
  handleKnightClick: (knightId: string) => void;
  handleActivateKnight: (knightId: string) => Promise<void>;
  handleMoveKnight: (knightId: string) => void;
  handleUpgradeKnight: (knightId: string) => Promise<void>;
  handleStartSmithSelection: () => void;
  handleSmithKnightSelected: (knightId: string) => void;
  handleConfirmSmithPromotions: () => Promise<void>;
  handleRemoveDisplacedKnight: (knightId: string) => Promise<void>;
}

/**
 * Creates a knight controller instance with all knight-related handlers
 */
export function createKnightController(deps: KnightControllerDeps): KnightController {
  const { roomId, playerId, gameState, selectionManager, getOptimisticState, handlePlayProgressCard } = deps;

  /**
   * Handles knight click on board
   * Routes to smith selection if in smith mode, otherwise selects knight
   */
  const handleKnightClick = (knightId: string) => {
    if (selectionManager.selectingKnightsForSmith) {
      handleSmithKnightSelected(knightId);
      return;
    }

    selectionManager.setSelectedKnightId(knightId);
    selectionManager.setBuildMode(null);
  };

  /**
   * Activates a knight (requires wheat)
   */
  const handleActivateKnight = async (knightId: string) => {
    try {
      await activateKnight(roomId, playerId, knightId);
    } catch (e) {
      console.error('Error activating knight:', e);
    }
  };

  /**
   * Enters knight movement mode - player will click target vertex
   */
  const handleMoveKnight = (knightId: string) => {
    selectionManager.setMovingKnightId(knightId);
    selectionManager.setBuildMode(null);
  };

  /**
   * Upgrades knight strength (basic -> strong -> mighty)
   */
  const handleUpgradeKnight = async (knightId: string) => {
    try {
      await upgradeKnight(roomId, playerId, knightId);
    } catch (e) {
      console.error('Error upgrading knight:', e);
    }
  };

  /**
   * Starts smith card selection mode
   * Allows player to select up to 2 knights to promote
   */
  const handleStartSmithSelection = () => {
    if (!gameState) return;
    const effectiveState = getOptimisticState(gameState);
    const promotableKnights = effectiveState ? getPromotableKnights(effectiveState, playerId) : [];

    if (promotableKnights.length === 0) return;

    if (selectionManager.selectingKnightsForSmith) {
      selectionManager.clearAllSelections();
      return;
    }

    selectionManager.clearAllSelections();
    selectionManager.setSelectingKnightsForSmith(true);
    selectionManager.setSelectedSmithKnightIds([]);
    selectionManager.setSmithError(null);
  };

  /**
   * Handles knight selection during smith card flow
   * Allows up to 2 knights to be selected
   */
  const handleSmithKnightSelected = (knightId: string) => {
    if (!selectionManager.selectingKnightsForSmith) return;

    const effectiveState = gameState ? getOptimisticState(gameState) : null;
    const promotableKnights = effectiveState ? getPromotableKnights(effectiveState, playerId) : [];
    const isPromotable = promotableKnights.some(k => k.id === knightId);
    if (!isPromotable) return;

    selectionManager.setSmithError(null);
    const prev = selectionManager.selectedSmithKnightIds;

    if (prev.includes(knightId)) {
      selectionManager.setSelectedSmithKnightIds(prev.filter(id => id !== knightId));
    } else if (prev.length >= 2) {
      selectionManager.setSelectedSmithKnightIds([prev[0], knightId]);
    } else {
      selectionManager.setSelectedSmithKnightIds([...prev, knightId]);
    }
  };

  /**
   * Confirms smith card usage and promotes selected knights
   */
  const handleConfirmSmithPromotions = async () => {
    if (selectionManager.selectedSmithKnightIds.length === 0) return;

    try {
      await handlePlayProgressCard('smith', { knightIds: selectionManager.selectedSmithKnightIds });
      selectionManager.setSelectingKnightsForSmith(false);
      selectionManager.setSelectedSmithKnightIds([]);
      selectionManager.setSmithError(null);
    } catch (e: any) {
      selectionManager.setSmithError(e?.message || 'Failed to promote knights');
    }
  };

  /**
   * Removes a displaced knight (no valid relocation targets)
   */
  const handleRemoveDisplacedKnight = async (knightId: string) => {
    try {
      await relocateKnight(roomId, playerId, knightId, null);
    } catch (e) {
      console.error('Error removing knight:', e);
    }
  };

  return {
    handleKnightClick,
    handleActivateKnight,
    handleMoveKnight,
    handleUpgradeKnight,
    handleStartSmithSelection,
    handleSmithKnightSelected,
    handleConfirmSmithPromotions,
    handleRemoveDisplacedKnight,
  };
}
