import { NextResponse } from 'next/server';
import { selectMetropolisCity } from '@/lib/services/improvement-service';
import { ImprovementType } from '@/core/rules/commodity-constants';

/**
 * Metropolis API Route (Cities & Knights Expansion)
 * Handles metropolis city selection after reaching level 4 or 5
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, vertexId, improvementType } = body;

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (action !== 'select_city') {
            return NextResponse.json(
                { error: 'Only select_city action is supported' },
                { status: 400 }
            );
        }

        if (!vertexId) {
            return NextResponse.json(
                { error: 'vertexId is required' },
                { status: 400 }
            );
        }

        if (!improvementType || !['science', 'trade', 'politics'].includes(improvementType)) {
            return NextResponse.json(
                { error: 'improvementType must be science, trade, or politics' },
                { status: 400 }
            );
        }

        const gameState = await selectMetropolisCity(
            roomId,
            playerId,
            vertexId,
            improvementType as ImprovementType
        );

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Metropolis selection error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
