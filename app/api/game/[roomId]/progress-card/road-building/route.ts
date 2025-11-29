import { NextResponse } from 'next/server';
import { cancelRoadBuildingProgress, finalizeRoadBuildingProgress } from '@/lib/services/progress-card-service';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action } = body;

        if (!playerId) {
            return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 });
        }

        let gameState;
        if (action === 'cancel') {
            gameState = await cancelRoadBuildingProgress(roomId, playerId);
        } else if (action === 'complete' || action === 'finalize') {
            gameState = await finalizeRoadBuildingProgress(roomId, playerId);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Road Building progress card action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
