import { db } from '@/lib/db';
import { rooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Generate ETag from room data
 */
function generateETag(data: string): string {
    const hash = createHash('sha256')
        .update(data)
        .digest('hex')
        .substring(0, 16);
    return `"${hash}"`;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id?: string }> }
) {
    const { id: roomId } = await params;

    if (!roomId) {
        return NextResponse.json({ error: 'Room id is required' }, { status: 400 });
    }

    const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
    });

    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const { LobbyService } = await import('@/lib/services/lobby-service');
    const roomPlayers = await LobbyService.getPlayersWithColors(roomId);

    const responseData = { room, players: roomPlayers };
    const etag = generateETag(JSON.stringify(responseData));

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
        return new NextResponse(null, {
            status: 304,
            headers: {
                'ETag': etag,
                'Cache-Control': 'no-cache',
            }
        });
    }

    return NextResponse.json(responseData, {
        headers: {
            'ETag': etag,
            'Cache-Control': 'no-cache',
        }
    });
}
