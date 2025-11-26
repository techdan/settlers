import { NextResponse } from 'next/server';
import { buildPlayerMetropolis } from '@/lib/services/improvement-service';

/**
 * Metropolis API Route (Cities & Knights Expansion)
 * Handles metropolis building and stealing
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, metropolisType, vertexId } = body;

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (!action) {
            return NextResponse.json(
                { error: 'action is required' },
                { status: 400 }
            );
        }

        if (!metropolisType) {
            return NextResponse.json(
                { error: 'metropolisType is required' },
                { status: 400 }
            );
        }

        if (!vertexId) {
            return NextResponse.json(
                { error: 'vertexId is required' },
                { status: 400 }
            );
        }

        let gameState;

        switch (action) {
            case 'build':
            case 'steal':
                // Both build and steal use the same function - the manager handles ownership transfer
                gameState = await buildPlayerMetropolis(roomId, playerId, vertexId, metropolisType);
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Metropolis action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
