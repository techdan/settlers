import { useEffect, useState } from 'react';
import { GameState } from '@/lib/types';
import { synchronizeTimerClock } from '@/lib/services/timer-clock';
import { subscribeRoomResource } from '@/lib/room-transport';

export function useGameSubscription(roomId: string, initialGameState: GameState | null) {
    const [gameState, setGameState] = useState<GameState | null>(initialGameState);
    useEffect(() => {
        if (!roomId) return;
        const subscription = subscribeRoomResource<GameState>(roomId, `/api/game/${roomId}`, {
            value: state => setGameState(previous => synchronizeTimerClock(state, previous)),
        });
        return () => subscription.close();
    }, [roomId]);
    return gameState;
}
