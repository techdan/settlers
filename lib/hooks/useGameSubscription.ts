import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameState } from '@/lib/types';

export function useGameSubscription(roomId: string, initialGameState: GameState | null) {
    // Only use initial state on mount, then Realtime takes over
    const [gameState, setGameState] = useState<GameState | null>(initialGameState);

    useEffect(() => {
        if (!roomId) return;

        // Fetch the latest state when subscription connects to avoid race conditions
        const fetchLatestState = async () => {
            try {
                const res = await fetch(`/api/game/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    setGameState(data);
                }
            } catch (e) {
                console.error('[useGameSubscription] Failed to fetch latest state:', e);
            }
        };

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
                            setGameState(newState);
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
