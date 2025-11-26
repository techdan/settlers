import { NextResponse } from 'next/server';
import {
    upgradePlayerImprovement,
    buildPlayerMetropolis
} from '@/lib/services/improvement-service';
import { ImprovementType, MetropolisType } from '@/core/rules/commodity-constants';

/**
 * Improvement API Route (Cities & Knights Expansion)
 * Handles city improvement and metropolis actions
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, improvement, vertexId } = body;

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

        let gameState;

        switch (action) {
            case 'upgrade':
                if (!improvement) {
                    return NextResponse.json(
                        { error: 'improvement is required for upgrade action' },
                        { status: 400 }
                    );
                }
                // Validate improvement type
                if (!['science', 'trade', 'politics'].includes(improvement)) {
                    return NextResponse.json(
                        { error: 'improvement must be science, trade, or politics' },
                        { status: 400 }
                    );
                }
                gameState = await upgradePlayerImprovement(
                    roomId,
                    playerId,
                    improvement as ImprovementType
                );
                break;

            case 'metropolis':
                if (!improvement || !vertexId) {
                    return NextResponse.json(
                        { error: 'improvement and vertexId are required for metropolis action' },
                        { status: 400 }
                    );
                }
                // Validate improvement type
                if (!['science', 'trade', 'politics'].includes(improvement)) {
                    return NextResponse.json(
                        { error: 'improvement must be science, trade, or politics' },
                        { status: 400 }
                    );
                }
                gameState = await buildPlayerMetropolis(
                    roomId,
                    playerId,
                    vertexId,
                    improvement as MetropolisType
                );
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Improvement action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
