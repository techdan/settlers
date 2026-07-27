import { useCallback, useState } from 'react';
import type { GameState } from '@/lib/types';
import { useRobberInteractions } from './useRobberInteractions';

interface UseGameRobberStateParams {
    gameState: GameState | null;
    roomId: string;
    playerId: string;
    onGameStateUpdated: (gameState: GameState) => void;
}

export function getRobberPromptKey(
    gameState: GameState | null,
    playerId: string
): string | null {
    if (
        gameState?.phase !== 'robber_placement' ||
        gameState.currentTurn !== playerId
    ) {
        return null;
    }

    return [
        gameState.currentTurn,
        gameState.logs.length,
        gameState.logs.at(-1)?.id ?? '',
    ].join(':');
}

export function useGameRobberState({
    gameState,
    roomId,
    playerId,
    onGameStateUpdated,
}: UseGameRobberStateParams) {
    const [dismissedPromptKey, setDismissedPromptKey] =
        useState<string | null>(null);
    const interactions = useRobberInteractions({
        roomId,
        playerId,
        onGameStateUpdated,
    });
    const promptKey = getRobberPromptKey(gameState, playerId);
    const showMovePrompt =
        promptKey !== null && promptKey !== dismissedPromptKey;

    const handleMoveStarted = useCallback(() => {
        setDismissedPromptKey(promptKey);
    }, [promptKey]);

    return {
        ...interactions,
        showMovePrompt,
        handleMoveStarted,
    };
}
