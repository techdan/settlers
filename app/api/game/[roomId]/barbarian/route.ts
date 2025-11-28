import { NextResponse } from 'next/server';
import { resolveBarbarianAttackAction, loseCityToBarbarianAction } from '@/lib/services/ck-game-service';

/**
 * Barbarian API Route (Cities & Knights Expansion)
 * Handles barbarian attack resolution and city loss selection
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { action, playerId, vertexId } = body;

        if (action === 'resolve') {
            // Auto-resolve stuck barbarian attack
            const gameState = await resolveBarbarianAttackAction(roomId);
            return NextResponse.json(gameState);
        } else if (action === 'lose_city') {
            // Player chooses which city to lose
            if (!playerId || !vertexId) {
                return NextResponse.json(
                    { error: 'playerId and vertexId required for lose_city action' },
                    { status: 400 }
                );
            }
            const gameState = await loseCityToBarbarianAction(roomId, playerId, vertexId);
            return NextResponse.json(gameState);
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Must be "resolve" or "lose_city"' },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('Barbarian attack error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
