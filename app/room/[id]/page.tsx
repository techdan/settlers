import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { LobbyView } from '@/components/lobby-view';

export async function generateMetadata({
    params,
}: {
    params: { id: string };
}): Promise<Metadata> {
    const roomId = params?.id;
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
    params: { id: string };
    searchParams?: { playerId?: string };
}) {
    const roomId = params.id;

    if (!roomId) {
        notFound();
    }
    const playerId = searchParams?.playerId;

    let room: Awaited<ReturnType<typeof db.query.rooms.findFirst>>;
    try {
        room = await db.query.rooms.findFirst({
            where: eq(rooms.id, roomId),
        });
    } catch (error) {
        console.error('Failed to load room', { roomId, error });
        notFound();
    }

    if (!room) {
        notFound();
    }

    const { LobbyService } = await import('@/lib/services/lobby-service');
    let roomPlayers: Awaited<ReturnType<typeof LobbyService.getPlayersWithColors>>;
    try {
        roomPlayers = await LobbyService.getPlayersWithColors(roomId);
    } catch (error) {
        console.error('Failed to load room players', { roomId, error });
        notFound();
    }

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
