import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import * as chatService from '@/lib/services/chat-service';

/**
 * Generate ETag from messages array
 */
function generateETag(messages: unknown[]): string {
    const hash = createHash('sha256')
        .update(JSON.stringify(messages))
        .digest('hex')
        .substring(0, 16);
    return `"${hash}"`;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const before = url.searchParams.get('before') || undefined;

    const messages = await chatService.getRecentMessages(roomId, limit, before);

    // Generate ETag from messages
    const etag = generateETag(messages);

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
        return new NextResponse(null, {
            status: 304,
            headers: {
                'ETag': etag,
                'Cache-Control': 'no-cache',
            },
        });
    }

    return NextResponse.json(messages, {
        headers: {
            'ETag': etag,
            'Cache-Control': 'no-cache',
        },
    });
}
