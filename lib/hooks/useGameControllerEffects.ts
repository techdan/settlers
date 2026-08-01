import { useEffect } from 'react';
import type { GameState, InventorSwapEvent, ProgressCardType, TheftEvent } from '@/lib/types';
import { resolveBarbarianAttack } from '@/app/actions';
import { synchronizeTimerClock } from '@/lib/services/timer-clock';
import type { SelectionState } from './useSelectionManager';

type SelectedCardSelectionState = Pick<
  SelectionState,
  | 'selectingHexForCard'
  | 'selectingVertexForCard'
  | 'selectingEdgeForCard'
  | 'selectingCityForEngineer'
  | 'selectingCityForMedicine'
  | 'selectingCityForMetropolis'
  | 'selectingKnightsForSmith'
  | 'isCraneDialogOpen'
  | 'treasonMode'
  | 'isTreasonModalOpen'
>;

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
  seenTheftIdsRef: React.MutableRefObject<Set<string>>,
  setTheftNotifications: React.Dispatch<React.SetStateAction<TheftEvent[]>>
) {
  useEffect(() => {
    if (!baseGameState) return;

    const eventKey = (theft: TheftEvent) =>
      theft.id ?? [
        theft.timestamp,
        theft.thiefId,
        theft.victimId ?? '',
        theft.source ?? '',
        theft.victims?.map(victim => victim.victimId).join(',') ?? '',
      ].join(':');

    const candidates = [...(baseGameState.theftEvents ?? [])];
    const latest = baseGameState.lastTheft;
    if (latest && !candidates.some(theft => eventKey(theft) === eventKey(latest))) {
      candidates.push(latest);
    }

    const now = Date.now();
    const notifications: TheftEvent[] = [];
    for (const theft of candidates.sort((a, b) => a.timestamp - b.timestamp)) {
      if (!theft.timestamp) continue;

      const key = eventKey(theft);
      if (seenTheftIdsRef.current.has(key)) continue;

      const isThief = theft.thiefId === playerId;
      const isVictim =
        theft.victimId === playerId ||
        theft.victims?.some(victim => victim.victimId === playerId);
      const isRecent = now - theft.timestamp < 15000;
      if ((isThief || isVictim) && isRecent) {
        notifications.push(theft);
      } else {
        seenTheftIdsRef.current.add(key);
      }
    }

    if (notifications.length > 0) {
      setTheftNotifications(current => {
        const queuedKeys = new Set(current.map(eventKey));
        const newNotifications = notifications.filter(theft => !queuedKeys.has(eventKey(theft)));
        return newNotifications.length > 0 ? [...current, ...newNotifications] : current;
      });
    }
  }, [
    baseGameState,
    playerId,
    seenTheftIdsRef,
    setTheftNotifications,
  ]);
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

export function useInventorSwapNotificationEffect(
  baseGameState: GameState | null,
  lastInventorSwapSeenRef: React.MutableRefObject<string | null>,
  setInventorSwapNotification: (event: InventorSwapEvent | null) => void
) {
  useEffect(() => {
    const swap = baseGameState?.lastInventorSwap;
    if (!swap || swap.id === lastInventorSwapSeenRef.current) return;

    lastInventorSwapSeenRef.current = swap.id;
    if (!swap.timestamp || Date.now() - swap.timestamp >= 15000) return;

    setInventorSwapNotification(swap);
  }, [
    baseGameState?.lastInventorSwap,
    lastInventorSwapSeenRef,
    setInventorSwapNotification,
  ]);
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
  const shouldReset =
    gameState !== null &&
    (gameState.currentTurn !== playerId || gameState.phase === 'waiting_for_roll');

  useEffect(() => {
    if (shouldReset) {
      setTurnSubmitted(false);
    }
  }, [setTurnSubmitted, shouldReset]);
}

export function useGameOverModalEffect(
  gameState: GameState | null,
  setShowGameOverModal: (show: boolean) => void
) {
  const isGameOver =
    gameState?.phase === 'game_over' || Boolean(gameState?.winner);

  useEffect(() => {
    if (isGameOver) {
      setShowGameOverModal(true);
    }
  }, [isGameOver, setShowGameOverModal]);
}

export function useSelectedCardAutoClear(
  selectedProgressCard: ProgressCardType | null,
  selectionManager: SelectedCardSelectionState,
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
