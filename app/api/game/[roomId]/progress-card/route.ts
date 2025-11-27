import { NextResponse } from 'next/server';
import { getGameStateByRoomId, updateGameState } from '@/lib/repositories/game-repository';
import { playProgressCard } from '@/core/engine/progress/progress-card-manager';
import { ProgressCardType } from '@/lib/types/player';

/**
 * Progress Card API Route (Cities & Knights Expansion)
 * Handles playing progress cards
 */

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const roomId = (await params).roomId;
        const body = await request.json();
        const { playerId, cardType, options } = body;

        if (!playerId) {
            return NextResponse.json(
                { error: 'playerId is required' },
                { status: 400 }
            );
        }

        if (!cardType) {
            return NextResponse.json(
                { error: 'cardType is required' },
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
                { error: 'Progress cards are only available in Cities & Knights mode' },
                { status: 400 }
            );
        }

        // Validate turn
        if (gameState.currentTurn !== playerId) {
            return NextResponse.json(
                { error: 'Not your turn' },
                { status: 403 }
            );
        }

        // Phase validation: Alchemy can be played before dice roll, all others after
        const isAlchemy = cardType === 'alchemist';

        if (isAlchemy) {
            // Alchemy can be played in waiting_for_roll or main_phase
            if (gameState.phase !== 'waiting_for_roll' && gameState.phase !== 'main_phase') {
                return NextResponse.json(
                    { error: 'Alchemist can only be played before or after rolling dice' },
                    { status: 400 }
                );
            }
        } else {
            // All other progress cards can only be played in main_phase (after dice roll)
            if (gameState.phase !== 'main_phase') {
                return NextResponse.json(
                    { error: 'Progress cards can only be played after rolling dice (except Alchemist)' },
                    { status: 400 }
                );
            }
        }

        // Play the progress card
        playProgressCard(gameState, playerId, cardType as ProgressCardType, options);

        // Save to database
        await updateGameState(gameState);

        return NextResponse.json(gameState);
    } catch (error: any) {
        console.error('Progress card action error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
