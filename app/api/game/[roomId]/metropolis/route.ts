import { NextResponse } from 'next/server';

/**
 * Metropolis API Route (Cities & Knights Expansion)
 * DEPRECATED: Metropolises are now automatically awarded/stolen via improvement upgrades.
 */

export async function POST(request: Request) {
    return NextResponse.json(
        { error: 'Metropolises are automatically awarded when reaching improvement level 4/5. Manual building is deprecated.' },
        { status: 400 }
    );
}
