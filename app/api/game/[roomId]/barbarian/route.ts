import { NextResponse } from 'next/server';
import { resolveBarbarianAttackAction } from '@/lib/services/ck-game-service';

/**
 * Barbarian API Route (Cities & Knights Expansion)
 * Handles barbarian attack resolution
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;

        // Resolve the barbarian attack
        const gameState = await resolveBarbarianAttackAction(roomId);

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Barbarian attack error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
