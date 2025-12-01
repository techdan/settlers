import { NextResponse } from 'next/server';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import {
    makeCommercialHarborOffers,
    respondToCommercialHarbor
} from '@/core/engine/progress/progress-card-manager';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ResourceType } from '@/core/rules/board-constants';

/**
 * Commercial Harbor API Route
 * Handles making batch offers and responding
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, action, offers, commodity } = body;

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (!action) {
            return NextResponse.json(
                { error: 'action is required (makeOffers or respond)' },
                { status: 400 }
            );
        }

        // Get game state
        const gameState = await getGameStateByRoomId(roomId);
        if (!gameState) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            );
        }

        // Validate C&K mode
        if (gameState.gameMode !== 'cities_and_knights') {
            return NextResponse.json(
                { error: 'Commercial Harbor is only available in Cities & Knights mode' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'makeOffers':
                if (!offers || !Array.isArray(offers)) {
                    return NextResponse.json(
                        { error: 'offers array is required' },
                        { status: 400 }
                    );
                }
                makeCommercialHarborOffers(gameState, playerId, offers);
                break;

            case 'respond':
                // commodity can be null (player has no commodities)
                const validCommodities: (CommodityType | null)[] = ['paper', 'cloth', 'coin', null];
                if (!validCommodities.includes(commodity as CommodityType | null)) {
                    return NextResponse.json(
                        { error: 'Invalid commodity type' },
                        { status: 400 }
                    );
                }
                respondToCommercialHarbor(gameState, playerId, commodity as CommodityType | null);
                break;

            case 'cancel':
                // Cancel Commercial Harbor - just clear the state without removing the card
                if (!gameState.pendingCommercialHarbor) {
                    return NextResponse.json(
                        { error: 'No active Commercial Harbor session' },
                        { status: 400 }
                    );
                }
                if (gameState.pendingCommercialHarbor.initiatorId !== playerId) {
                    return NextResponse.json(
                        { error: 'Only the initiator can cancel' },
                        { status: 403 }
                    );
                }
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${gameState.players.find(p => p.id === playerId)?.name} cancelled Commercial Harbor`,
                    playerId
                });
                gameState.pendingCommercialHarbor = undefined;
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Must be makeOffers, respond, or cancel' },
                    { status: 400 }
                );
        }

        // Save to database
        await updateGameState(gameState);

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Commercial Harbor error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
