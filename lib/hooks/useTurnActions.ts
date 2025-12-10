import { useCallback } from 'react';
import { rollDice, endTurn } from '@/app/actions';
import { GameState } from '@/lib/types';

interface UseTurnActionsParams {
  roomId: string;
  playerId: string;
  baseGameState: GameState | null;
  getOptimisticState: (state: GameState) => GameState;
  applyOptimisticUpdate: (id: string, updater: (state: GameState) => GameState) => void;
  clearOptimisticUpdate: (id: string) => void;
  setTurnSubmitted: (submitted: boolean) => void;
  isCitiesAndKnights: boolean;
  currentPlayer: { progressCards?: any[] } | null | undefined;
  setShowProgressCardDiscard: (show: boolean) => void;
  setProgressDiscardContext: (context: 'own_turn' | 'other_turn') => void;
}

export function useTurnActions({
  roomId,
  playerId,
  baseGameState,
  getOptimisticState,
  applyOptimisticUpdate,
  clearOptimisticUpdate,
  setTurnSubmitted,
  isCitiesAndKnights,
  currentPlayer,
  setShowProgressCardDiscard,
  setProgressDiscardContext,
}: UseTurnActionsParams) {
  const handleRollDiceClick = useCallback(async () => {
    const optimisticId = `roll-dice-${roomId}`;

    applyOptimisticUpdate(optimisticId, state => {
      if (state.currentTurn !== playerId || state.phase !== 'waiting_for_roll') return state;
      return { ...state, phase: 'main_phase' };
    });

    try {
      await rollDice(roomId, playerId);
    } catch (e) {
      console.error('Failed to roll dice', e);
    } finally {
      clearOptimisticUpdate(optimisticId);
    }
  }, [applyOptimisticUpdate, clearOptimisticUpdate, playerId, roomId]);

  const handleEndTurnClick = useCallback(async () => {
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
      applyOptimisticUpdate(optimisticId, state => {
        if (state.currentTurn !== playerId) return state;
        const nextId = nextPlayerId || state.currentTurn;
        return {
          ...state,
          currentTurn: nextId,
          phase: 'waiting_for_roll',
          diceRoll: undefined,
          tradeOffer: null,
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
  }, [
    applyOptimisticUpdate,
    baseGameState,
    clearOptimisticUpdate,
    currentPlayer?.progressCards?.length,
    getOptimisticState,
    isCitiesAndKnights,
    playerId,
    roomId,
    setProgressDiscardContext,
    setShowProgressCardDiscard,
    setTurnSubmitted,
  ]);

  return { handleRollDiceClick, handleEndTurnClick };
}
