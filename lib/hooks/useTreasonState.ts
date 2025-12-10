import { useEffect, useMemo } from 'react';
import { GameState } from '@/lib/types';
import { TreasonEffect } from '@/lib/types/game';
import { SelectionState } from './useSelectionManager';
import { isValidKnightPlacement } from '@/core/validation/knight-validator';

interface UseTreasonStateParams {
  gameState: GameState | null;
  playerId: string;
  treasonEffect?: TreasonEffect;
  isTreasonInitiator: boolean;
  isTreasonTarget: boolean;
  selectionManager: SelectionState;
  resetTreasonLocalState: (keepModal?: boolean) => void;
}

export function useTreasonState({
  gameState,
  playerId,
  treasonEffect,
  isTreasonInitiator,
  isTreasonTarget,
  selectionManager,
  resetTreasonLocalState,
}: UseTreasonStateParams) {
  useEffect(() => {
    if (!treasonEffect) {
      if (selectionManager.treasonMode !== 'select_opponent') {
        resetTreasonLocalState();
      }
      if (
        selectionManager.selectingVertexForCard === 'treason_remove' ||
        selectionManager.selectingVertexForCard === 'treason_place'
      ) {
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
        if (
          selectionManager.selectingVertexForCard === 'treason_remove' ||
          selectionManager.selectingVertexForCard === 'treason_place'
        ) {
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
        resetTreasonLocalState();
        const currentSelection = selectionManager.selectingVertexForCard;
        if (currentSelection === 'treason_remove' || currentSelection === 'treason_place') {
          selectionManager.setSelectingVertexForCard(null);
        }
      }
    }
  }, [
    isTreasonInitiator,
    isTreasonTarget,
    resetTreasonLocalState,
    selectionManager,
    selectionManager.selectingVertexForCard,
    selectionManager.treasonMode,
    treasonEffect,
  ]);

  const treasonOpponents = useMemo(() => {
    if (!gameState) return [];
    return gameState.players
      .filter(p => p.id !== playerId)
      .map(p => {
        const knightCount = (p.knights || []).length;
        return {
          id: p.id,
          name: p.name,
          color: p.color ? p.color : undefined,
          knightCount,
          hasKnights: knightCount > 0,
        };
      });
  }, [gameState, playerId]);

  const treasonEffectLevel = treasonEffect?.removedKnight?.level;
  const treasonSupplyAvailable = useMemo(() => {
    if (!treasonEffectLevel || !gameState || !isTreasonInitiator) return true;
    const knightCount = (gameState.players.find(p => p.id === playerId)?.knights || []).filter(
      k => k.level === treasonEffectLevel
    ).length;
    return knightCount < 2;
  }, [gameState, isTreasonInitiator, playerId, treasonEffectLevel]);

  const treasonHasLegalPlacement = useMemo(() => {
    if (!gameState || !isTreasonInitiator) return true;
    return Object.keys(gameState.board.vertices).some(vId => isValidKnightPlacement(gameState, vId, playerId));
  }, [gameState, isTreasonInitiator, playerId]);

  const treasonStatus = (() => {
    const treasonTargetId = treasonEffect?.targetPlayerId;
    if (selectionManager.treasonMode === 'waiting_for_knight' && treasonTargetId && gameState) {
      const targetName = gameState.players.find(p => p.id === treasonTargetId)?.name || 'opponent';
      return `Waiting for ${targetName} to remove a knight.`;
    }
    if (selectionManager.treasonMode === 'select_knight') {
      return selectionManager.treasonSelectedKnightId
        ? 'Selected knight. Click Remove to continue.'
        : 'Click one of your knights to remove it.';
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
  const showTreasonModal = Boolean(
    selectionManager.isTreasonModalOpen &&
    selectionManager.treasonMode &&
    (selectionManager.treasonMode !== 'place_knight' || !treasonSupplyAvailable || !treasonHasLegalPlacement)
  );

  return {
    treasonOpponents,
    treasonEffectLevel,
    treasonSupplyAvailable,
    treasonHasLegalPlacement,
    treasonStatus,
    showTreasonPlacePrompt,
    showTreasonModal,
  };
}
