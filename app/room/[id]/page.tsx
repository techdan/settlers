import { db } from '@/lib/db';
import { rooms, players } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { LobbyView } from '@/components/lobby-view';

export default async function RoomPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ playerId: string }>;
}) {
    const roomId = (await params).id;
    const playerId = (await searchParams).playerId;

    const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
    });

    if (!room) {
        notFound();
    }

    const roomPlayers = await db.query.players.findMany({
        where: eq(players.roomId, roomId),
    });

    return (
        <LobbyView
            initialRoom={room}
            initialPlayers={roomPlayers}
            roomId={roomId}
            currentPlayerId={playerId}
        />
    );
}
