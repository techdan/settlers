import { useCallback, useState } from 'react';
import type { GameState } from '@/lib/types';
import {
    useGameOverModalEffect,
    useProgressDiscardEnforcement,
    useTurnSubmissionReset,
} from './useGameControllerEffects';

type ProgressDiscardContext = 'own_turn' | 'other_turn';

interface UseGameModalStateParams {
    baseGameState: GameState | null;
    gameState: GameState | null;
    playerId: string;
    getOptimisticState: (state: GameState) => GameState;
}

export function useGameModalState({
    baseGameState,
    gameState,
    playerId,
    getOptimisticState,
}: UseGameModalStateParams) {
    const [showTrade, setShowTrade] = useState(false);
    const [turnSubmitted, setTurnSubmitted] = useState(false);
    const [showGameOverModal, setShowGameOverModal] = useState(false);
    const [showProgressCardDiscard, setShowProgressCardDiscard] =
        useState(false);
    const [progressDiscardContext, setProgressDiscardContext] =
        useState<ProgressDiscardContext>('own_turn');

    useGameOverModalEffect(gameState, setShowGameOverModal);
    useProgressDiscardEnforcement(
        baseGameState,
        playerId,
        getOptimisticState,
        showProgressCardDiscard,
        setShowProgressCardDiscard,
        progressDiscardContext,
        setProgressDiscardContext
    );
    useTurnSubmissionReset(gameState, playerId, setTurnSubmitted);

    const openTrade = useCallback(() => setShowTrade(true), []);
    const closeTrade = useCallback(() => setShowTrade(false), []);
    const openGameOverModal = useCallback(
        () => setShowGameOverModal(true),
        []
    );
    const closeGameOverModal = useCallback(
        () => setShowGameOverModal(false),
        []
    );
    const closeProgressCardDiscard = useCallback(() => {
        setShowProgressCardDiscard(false);
        setProgressDiscardContext('own_turn');
    }, []);

    return {
        showTrade,
        openTrade,
        closeTrade,
        turnSubmitted,
        setTurnSubmitted,
        showGameOverModal,
        openGameOverModal,
        closeGameOverModal,
        showProgressCardDiscard,
        setShowProgressCardDiscard,
        progressDiscardContext,
        setProgressDiscardContext,
        closeProgressCardDiscard,
    };
}
