import { NextRequest, NextResponse } from 'next/server';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { ProgressCardType } from '@/lib/types/player';
import { randomUUID } from 'crypto';

/**
 * POST /api/game/[roomId]/progress-card/discard
 * Discard progress cards to meet hand limit
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const { roomId } = await params;
        const body = await request.json();
        const { playerId, cardsToDiscard } = body as {
            playerId: string;
            cardsToDiscard: ProgressCardType[];
        };

        if (!playerId || !cardsToDiscard || !Array.isArray(cardsToDiscard)) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const gameState = await getGameStateByRoomId(roomId);
        if (!gameState) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            );
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        if (!player.progressCards) {
            return NextResponse.json(
                { error: 'Player has no progress cards' },
                { status: 400 }
            );
        }

        // Validate that player has all the cards they want to discard
        for (const card of cardsToDiscard) {
            if (!player.progressCards.includes(card)) {
                return NextResponse.json(
                    { error: `Player does not have card: ${card}` },
                    { status: 400 }
                );
            }
        }

        // Remove the cards from player's hand
        for (const card of cardsToDiscard) {
            const index = player.progressCards.indexOf(card);
            if (index > -1) {
                player.progressCards.splice(index, 1);
            }
        }

        // Log the discard
        gameState.logs.push({
            id: randomUUID(),
            timestamp: Date.now(),
            message: `${player.name} discarded ${cardsToDiscard.length} progress card${cardsToDiscard.length !== 1 ? 's' : ''}`,
            playerId
        });

        await updateGameState(gameState);

        return NextResponse.json({ success: true, gameState });
    } catch (error) {
        console.error('Error discarding progress cards:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
