import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { GameState } from '@/lib/types';
import { synchronizeTimerClock } from '@/lib/services/timer-clock';

export function useGameSubscription(roomId: string, initialGameState: GameState | null) {
    // Only use initial state on mount, then Realtime takes over
    const [gameState, setGameState] = useState<GameState | null>(initialGameState);

    useEffect(() => {
        if (!roomId) return;
        const supabase = getSupabaseClient();

        // Fetch the latest state when subscription connects to avoid race conditions
        const fetchLatestState = async () => {
            try {
                const res = await fetch(`/api/game/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    setGameState(previousState =>
                        synchronizeTimerClock(data, previousState)
                    );
                }
            } catch (e) {
                console.error('[useGameSubscription] Failed to fetch latest state:', e);
            }
        };

        // Polling fallback when Realtime is unavailable (e.g. local-Postgres dev
        // without Supabase). Same pattern as the lobby's polling fallback.
        if (!supabase) {
            fetchLatestState();
            const interval = setInterval(fetchLatestState, 2000);
            return () => clearInterval(interval);
        }

        const channel = supabase
            .channel(`game:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'games',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    if (payload.new && payload.new.state) {
                        try {
                            const newState = JSON.parse(payload.new.state);
                            setGameState(previousState =>
                                synchronizeTimerClock(newState, previousState)
                            );
                        } catch (e) {
                            console.error('[useGameSubscription] Failed to parse game state update:', e);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    return gameState;
}
