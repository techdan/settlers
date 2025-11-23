import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const roomId = (await params).roomId;

    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const state = JSON.parse(game.state);
    return NextResponse.json(state);
}
