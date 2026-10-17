import { useEffect, useState } from 'react';
import { subscribeRoomResource } from '@/lib/room-transport';
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

const VALID_PLAYER_COLORS: readonly PlayerColor[] = [
    '#ff0000',
    '#0000ff',
    '#ff7a00',
    '#d4b483',
];

function isPlayerColor(value: unknown): value is PlayerColor {
    return VALID_PLAYER_COLORS.some(color => color === value);
}

function normalizePlayer(value: unknown): Player {
    const player = typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : {};
    const colorValue = player.color ?? null;
    const joinedAtValue = player.joinedAt ?? player.joined_at ?? null;

    return {
        id: typeof player.id === 'string' ? player.id : '',
        name: typeof player.name === 'string' ? player.name : '',
        isHost: Boolean(player.isHost ?? player.is_host ?? false),
        color: isPlayerColor(colorValue) ? colorValue : null,
        joinedAt: typeof joinedAtValue === 'string' ? joinedAtValue : null,
    };
}

export function useLobbySubscription(
    roomId: string,
    initialRoom: Room,
    initialPlayers: Player[]
) {
    const [room, setRoom] = useState<Room>(initialRoom);
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [isRealtime, setIsRealtime] = useState(false);
    useEffect(() => {
        if (!roomId) return;
        const subscription = subscribeRoomResource<{ room: Room; players: unknown[] }>(roomId, `/api/room/${roomId}`, {
            value: snapshot => {
                setRoom(snapshot.room);
                setPlayers(snapshot.players.map(normalizePlayer));
            },
            status: setIsRealtime,
        });
        return () => subscription.close();
    }, [roomId]);
    return { room, players, isRealtime };
}
