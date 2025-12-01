import { NextResponse } from 'next/server';
import { cancelTreason, placeTreasonKnight, selectTreasonKnight } from '@/lib/services/progress-card-service';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, knightId, vertexId } = body;

        if (!playerId) {
            return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 });
        }

        let gameState;

        if (action === 'remove_knight') {
            if (!knightId) {
                return NextResponse.json({ error: 'knightId is required' }, { status: 400 });
            }
            gameState = await selectTreasonKnight(roomId, playerId, knightId);
        } else if (action === 'place_knight') {
            gameState = await placeTreasonKnight(roomId, playerId, vertexId ?? null);
        } else if (action === 'cancel') {
            gameState = await cancelTreason(roomId, playerId);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Treason progress card action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
