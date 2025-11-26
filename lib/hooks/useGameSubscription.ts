import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameState } from '@/lib/types';

export function useGameSubscription(roomId: string, initialGameState: GameState | null) {
    const [gameState, setGameState] = useState<GameState | null>(initialGameState);

    useEffect(() => {
        // If we have initial state, set it
        if (initialGameState) {
            setGameState(initialGameState);
        }
    }, [initialGameState]);

    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`game:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'games',
                    filter: `roomId=eq.${roomId}`,
                },
                (payload) => {
                    if (payload.new && payload.new.state) {
                        try {
                            const newState = JSON.parse(payload.new.state);
                            setGameState(newState);
                        } catch (e) {
                            console.error('Failed to parse game state update:', e);
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to game updates for room ${roomId}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    return gameState;
}
