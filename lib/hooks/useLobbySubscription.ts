import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { PlayerColor } from '@/lib/types/player';

type Player = {
    id: string;
    name: string;
    isHost: boolean;
    color: PlayerColor | null;
    joinedAt?: string | null;
};

type Room = {
    id: string;
    status: string;
    metadata: string | null;
};

export function useLobbySubscription(
    roomId: string,
    initialRoom: Room,
    initialPlayers: Player[]
) {
    const [room, setRoom] = useState<Room>(initialRoom);
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [isRealtime, setIsRealtime] = useState(false);
    const supabase = useMemo(() => getSupabaseClient(), []);

    useEffect(() => {
        if (!roomId || !supabase) return;

        setIsRealtime(true);

        const normalizePlayer = (player: any): Player => {
            const colorValue = player.color ?? null;
            const validColors: PlayerColor[] = ['#ff0000', '#0000ff', '#ff7a00', '#d4b483'];

            return {
                id: player.id,
                name: player.name,
                isHost: Boolean(player.isHost ?? player.is_host ?? false),
                color: colorValue && validColors.includes(colorValue) ? colorValue : null,
                joinedAt: player.joinedAt ?? player.joined_at ?? null,
            };
        };

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

        // Subscribe to Player updates
        const playersChannel = supabase
            .channel(`players:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Refetch player list on any change
                    const { data, error } = await supabase
                        .from('players')
                        .select('*')
                        .eq('room_id', roomId)
                        .order('joined_at', { ascending: true });

                    if (data && !error) {
                        setPlayers(data.map(normalizePlayer));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(playersChannel);
        };
    }, [roomId, supabase]);

    return { room, players, isRealtime };
}
