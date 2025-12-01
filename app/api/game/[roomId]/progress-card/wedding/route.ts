import { NextResponse } from 'next/server';
import { submitWeddingGifts } from '@/lib/services/progress-card-service';
import { WeddingSelection } from '@/lib/types/game';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, selections } = body;

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (!Array.isArray(selections)) {
            return NextResponse.json(
                { error: 'selections array is required' },
                { status: 400 }
            );
        }

        const gameState = await submitWeddingGifts(roomId, playerId, selections as WeddingSelection[]);
        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Wedding progress card action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
