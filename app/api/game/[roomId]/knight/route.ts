import { NextResponse } from 'next/server';
import {
    buildKnightAction,
    activateKnightAction,
    moveKnightAction,
    upgradeKnightAction
} from '@/lib/services/knight-service';

/**
 * Knight API Route (Cities & Knights Expansion)
 * Handles knight-related actions
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, vertexId, knightId, targetVertexId } = body;

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
            case 'build':
                if (!vertexId) {
                    return NextResponse.json(
                        { error: 'vertexId is required for build action' },
                        { status: 400 }
                    );
                }
                gameState = await buildKnightAction(roomId, playerId, vertexId);
                break;

            case 'activate':
                if (!knightId) {
                    return NextResponse.json(
                        { error: 'knightId is required for activate action' },
                        { status: 400 }
                    );
                }
                gameState = await activateKnightAction(roomId, playerId, knightId);
                break;

            case 'move':
                if (!knightId || !targetVertexId) {
                    return NextResponse.json(
                        { error: 'knightId and targetVertexId are required for move action' },
                        { status: 400 }
                    );
                }
                gameState = await moveKnightAction(roomId, playerId, knightId, targetVertexId);
                break;

            case 'upgrade':
                if (!knightId) {
                    return NextResponse.json(
                        { error: 'knightId is required for upgrade action' },
                        { status: 400 }
                    );
                }
                gameState = await upgradeKnightAction(roomId, playerId, knightId);
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Knight action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
