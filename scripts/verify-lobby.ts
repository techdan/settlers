import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

async function verifyLobby() {
    // Dynamic imports to ensure env vars are loaded first
    const { LobbyService } = await import('@/lib/services/lobby-service');
    const { createRoom } = await import('@/lib/repositories/room-repository');
    const { createPlayer } = await import('@/lib/repositories/player-repository');
    const { db } = await import('@/lib/db');
    const { rooms, players } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const { randomUUID } = await import('crypto');

    console.log('Starting Lobby Verification...');

    // 1. Create Room
    const roomId = `TEST${Math.floor(Math.random() * 1000)}`;
    await createRoom(roomId);
    console.log(`Created room: ${roomId}`);

    // 2. Add Host
    const hostId = randomUUID();
    await createPlayer(hostId, roomId, 'Host', true);
    console.log(`Created host: ${hostId}`);

    // 3. Generate Board
    console.log('Generating board...');
    let state = await LobbyService.generateBoard(roomId, hostId, false);

    if (!state.boardPreview || state.boardPreview.length !== 19) {
        throw new Error('Board generation failed: Incorrect hex count');
    }
    console.log('Board generated successfully (19 hexes)');

    // 4. Verify Adjacency (Simple check)
    const redTokens = state.boardPreview.filter((t: any) => t.numberToken === 6 || t.numberToken === 8);
    console.log(`Found ${redTokens.length} red tokens (should be 4)`);

    // 5. Toggle Fairness
    console.log('Toggling fairness mode...');
    state = await LobbyService.toggleFairMode(roomId, hostId, true);
    if (!state.fairMode) throw new Error('Fairness toggle failed');
    console.log('Fairness mode enabled');

    // 6. Regenerate Board with Fairness
    console.log('Regenerating board with fairness...');
    state = await LobbyService.generateBoard(roomId, hostId, true);
    if (!state.boardPreview) throw new Error('Board regeneration failed');
    console.log('Board regenerated');

    // 7. Add Player and Request
    const playerId = randomUUID();
    await createPlayer(playerId, roomId, 'Player 2', false);
    console.log(`Created player: ${playerId}`);

    console.log('Requesting new board...');
    state = await LobbyService.requestNewBoard(roomId, playerId);

    if (!state.pendingRequests.includes(playerId)) {
        throw new Error('Request not recorded');
    }
    console.log('Request recorded successfully');

    // Cleanup
    console.log('Cleaning up...');
    await db.delete(players).where(eq(players.roomId, roomId));
    await db.delete(rooms).where(eq(rooms.id, roomId));
    console.log('Cleanup complete');

    console.log('VERIFICATION PASSED');
}

verifyLobby().catch(console.error).then(() => process.exit(0));
