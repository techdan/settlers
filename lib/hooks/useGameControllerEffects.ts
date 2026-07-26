import { useEffect } from 'react';
import { GameState } from '@/lib/types';
import { resolveBarbarianAttack } from '@/app/actions';
import { synchronizeTimerClock } from '@/lib/services/timer-clock';

export function useInitialGameState(roomId: string, setBaseGameState: (state: GameState) => void) {
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await fetch(`/api/game/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setBaseGameState(synchronizeTimerClock(data));
        }
      } catch (e) {
        console.error('Failed to fetch initial game state', e);
      }
    };
    fetchInitialState();
  }, [roomId, setBaseGameState]);
}

export function useResolveStuckBarbarian(baseGameState: GameState | null, roomId: string) {
  useEffect(() => {
    if (baseGameState?.phase === 'barbarian_attack') {
      const resolveStuckAttack = async () => {
        try {
          await resolveBarbarianAttack(roomId);
        } catch (e) {
          console.error('Error auto-resolving barbarian attack:', e);
        }
      };
      resolveStuckAttack();
    }
  }, [baseGameState?.phase, roomId]);
}

export function useSubscribedGameState(
  subscribedGameState: GameState | null,
  setBaseGameState: (state: GameState) => void
) {
  useEffect(() => {
    if (subscribedGameState) {
      setBaseGameState(subscribedGameState);
    }
  }, [setBaseGameState, subscribedGameState]);
}

export function useVPCardModalEffect(
  baseGameState: GameState | null,
  playerId: string,
  lastVPCardSeenRef: React.MutableRefObject<number>,
  setVpCardModalType: (type: 'printer' | 'constitution' | null) => void
) {
  useEffect(() => {
    const gain = baseGameState?.lastVPCardGain;
    if (!gain) return;
    if (gain.cardType !== 'printer' && gain.cardType !== 'constitution') return;
    if (gain.playerId !== playerId) return;
    if (gain.timestamp <= lastVPCardSeenRef.current) return;

    const isRecent = Date.now() - gain.timestamp < 8000;
    if (!isRecent) return;

    lastVPCardSeenRef.current = gain.timestamp;
    setVpCardModalType(gain.cardType);
  }, [baseGameState?.lastVPCardGain, lastVPCardSeenRef, playerId, setVpCardModalType]);
}

export function useTheftNotificationEffect(
  baseGameState: GameState | null,
  playerId: string,
  lastTheftSeenRef: React.MutableRefObject<number>,
  setTheftNotification: (theft: NonNullable<GameState['lastTheft']>) => void
) {
  useEffect(() => {
    const theft = baseGameState?.lastTheft;
    if (!theft) return;
    if (!theft.timestamp) return;
    if (theft.timestamp <= lastTheftSeenRef.current) return;

    const isThief = theft.thiefId === playerId;
    const isVictim = theft.victimId === playerId || theft.victims?.some(v => v.victimId === playerId);
    if (!isThief && !isVictim) return;

    const isRecent = Date.now() - theft.timestamp < 8000;
    if (!isRecent) return;

    lastTheftSeenRef.current = theft.timestamp;
    setTheftNotification(theft);
  }, [baseGameState?.lastTheft, lastTheftSeenRef, playerId, setTheftNotification]);
}

export function useTradeCompletionEffect(
  baseGameState: GameState | null,
  playerId: string,
  lastTradeSeenRef: React.MutableRefObject<number>,
  setShowTradeCompletion: (show: boolean) => void
) {
  useEffect(() => {
    const trade = baseGameState?.lastTrade;
    if (!trade) return;
    if (!trade.timestamp) return;
    if (trade.timestamp <= lastTradeSeenRef.current) return;

    const isInitiator = trade.initiatorId === playerId;
    const isAcceptor = trade.acceptorId === playerId;
    if (!isInitiator && !isAcceptor) return;

    const isRecent = Date.now() - trade.timestamp < 8000;
    if (!isRecent) return;

    lastTradeSeenRef.current = trade.timestamp;
    setShowTradeCompletion(true);
  }, [baseGameState?.lastTrade, lastTradeSeenRef, playerId, setShowTradeCompletion]);
}

export function useProgressDiscardEnforcement(
  baseGameState: GameState | null,
  playerId: string,
  getOptimisticState: (state: GameState) => GameState,
  showProgressCardDiscard: boolean,
  setShowProgressCardDiscard: (show: boolean) => void,
  progressDiscardContext: 'own_turn' | 'other_turn',
  setProgressDiscardContext: (ctx: 'own_turn' | 'other_turn') => void
) {
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
  }, [
    baseGameState,
    getOptimisticState,
    playerId,
    progressDiscardContext,
    setProgressDiscardContext,
    setShowProgressCardDiscard,
    showProgressCardDiscard,
  ]);
}

export function useTurnSubmissionReset(
  gameState: GameState | null,
  playerId: string,
  setTurnSubmitted: (val: boolean) => void
) {
  useEffect(() => {
    if (!gameState) return;
    if (gameState.currentTurn !== playerId || gameState.phase === 'waiting_for_roll') {
      setTurnSubmitted(false);
    }
  }, [gameState?.currentTurn, gameState?.phase, playerId, setTurnSubmitted]);
}

export function useGameOverModalEffect(
  gameState: GameState | null,
  setShowGameOverModal: (show: boolean) => void
) {
  useEffect(() => {
    if (gameState && (gameState.phase === 'game_over' || !!gameState.winner)) {
      setShowGameOverModal(true);
    }
  }, [gameState?.phase, gameState?.winner, setShowGameOverModal]);
}

export function useSelectedCardAutoClear(
  selectedProgressCard: string | null,
  selectionManager: {
    selectingHexForCard: any;
    selectingVertexForCard: any;
    selectingEdgeForCard: any;
    selectingCityForEngineer: any;
    selectingCityForMedicine: any;
    selectingCityForMetropolis: any;
    selectingKnightsForSmith: any;
    isCraneDialogOpen: any;
    treasonMode: any;
    isTreasonModalOpen: any;
  },
  clearSelectedCard: () => void
) {
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
    selectedProgressCard,
    selectionManager.isCraneDialogOpen,
    selectionManager.isTreasonModalOpen,
    selectionManager.selectingCityForEngineer,
    selectionManager.selectingCityForMedicine,
    selectionManager.selectingCityForMetropolis,
    selectionManager.selectingEdgeForCard,
    selectionManager.selectingHexForCard,
    selectionManager.selectingKnightsForSmith,
    selectionManager.selectingVertexForCard,
    selectionManager.treasonMode,
  ]);
}
