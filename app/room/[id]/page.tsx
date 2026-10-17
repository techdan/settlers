import type { Metadata } from 'next';
import { callRoom } from '@/lib/services/room-client';
import { notFound } from 'next/navigation';
import { LobbyView } from '@/components/lobby-view';

// Force dynamic rendering to prevent caching of board state
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id: roomId } = await params;
    const normalizedRoomId = roomId ? roomId.toUpperCase() : undefined;

    return {
        title: normalizedRoomId
            ? `Settlers of Lanc | Lobby ${normalizedRoomId}`
            : 'Settlers of Lanc | Lobby',
        description: 'Manage players and start your Settlers of Lanc game.',
    };
}

export default async function RoomPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ playerId?: string }>;
}) {
    const { id: roomId } = await params;

    if (!roomId) {
        notFound();
    }
    const { playerId } = (await searchParams) || {};

    const snapshot = await callRoom(roomId, 'reads', 'room', roomId);
    if (!snapshot) notFound();
    const { room, players: roomPlayers } = snapshot;
    // Serialize players for client component (convert Date to string)
    const serializedPlayers = roomPlayers.map(player => ({
        ...player,
        joinedAt: player.joinedAt?.toISOString() ?? null
    }));

    return (
        <LobbyView
            initialRoom={room}
            initialPlayers={serializedPlayers}
            roomId={roomId}
            currentPlayerId={playerId ?? ''}
        />
    );
}
