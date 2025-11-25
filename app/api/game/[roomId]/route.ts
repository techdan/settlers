import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Generate ETag from game state string
 * Uses SHA-256 hash for strong cache validation
 */
function generateETag(stateString: string): string {
    const hash = createHash('sha256')
        .update(stateString)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for shorter ETag
    return `"${hash}"`;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const roomId = (await params).roomId;

    const game = await db.query.games.findFirst({
        where: eq(games.roomId, roomId),
    });

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Generate ETag from the state string
    const etag = generateETag(game.state);

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
        // State hasn't changed, return 304 Not Modified
        return new NextResponse(null, {
            status: 304,
            headers: {
                'ETag': etag,
                'Cache-Control': 'no-cache', // Require validation
            }
        });
    }

    // State changed or no cache, return full state
    const state = JSON.parse(game.state);
    return NextResponse.json(state, {
        headers: {
            'ETag': etag,
            'Cache-Control': 'no-cache', // Require validation on subsequent requests
        }
    });
}
