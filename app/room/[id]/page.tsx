import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { LobbyView } from '@/components/lobby-view';

export default async function RoomPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ playerId?: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearch = searchParams ? await searchParams : {};

    const roomId = resolvedParams.id;

    if (!roomId) {
        notFound();
    }
    const playerId = resolvedSearch.playerId;

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

    return (
        <LobbyView
            initialRoom={room}
            initialPlayers={roomPlayers}
            roomId={roomId}
            currentPlayerId={playerId}
        />
    );
}
