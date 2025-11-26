import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Player = {
    id: string;
    name: string;
    isHost: boolean;
    color: string | null;
};

type Room = {
    id: string;
    status: string;
    metadata: string | null;
};

export function useLobbySubscription(roomId: string, initialRoom: Room, initialPlayers: Player[]) {
    const [room, setRoom] = useState<Room>(initialRoom);
    const [players, setPlayers] = useState<Player[]>(initialPlayers);

    useEffect(() => {
        if (!roomId) return;

        // Subscribe to Room updates
        const roomChannel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `id=eq.${roomId}`,
                },
                (payload) => {
                    if (payload.new) {
                        setRoom(payload.new as Room);
                    }
                }
            )
            .subscribe();

        // Subscribe to Player updates (INSERT, UPDATE, DELETE)
        const playersChannel = supabase
            .channel(`players:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events
                    schema: 'public',
                    table: 'players',
                    filter: `roomId=eq.${roomId}`,
                },
                async () => {
                    // For players, it's easier to just refetch the list on any change
                    // to ensure we have the correct order and full list
                    // Alternatively, we could manage the list state manually, but refetching is safer
                    const { data, error } = await supabase
                        .from('players')
                        .select('*')
                        .eq('roomId', roomId);

                    if (data && !error) {
                        setPlayers(data as Player[]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(playersChannel);
        };
    }, [roomId]);

    return { room, players };
}
