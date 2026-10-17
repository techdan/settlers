// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomExecution } from '../room-execution';
import { LobbyService } from '../lobby-service';
import { startGame } from '../game-service';
import { placeInitialRoad, placeInitialSettlement } from '../building-service';
import { getGameStateByRoomId } from '@/lib/repositories/game-repository';
import { isValidSetupRoad, isValidSetupSettlement } from '@/core/validation/setup-validator';
import { sendChatMessage, getRecentMessages } from '../chat-service';

afterEach(() => vi.useRealTimers());

describe('durable service and repository integration', () => {
    it.each(['base', 'cities_and_knights'] as const)('restores %s setup, chat and player identity a week later', async mode => {
        let persisted: string | null = null;
        const storage = { read: () => persisted, write: (value: string) => { persisted = value; } };
        let room = new RoomExecution('TEST', storage);
        const host = await room.run(() => LobbyService.createRoom('Host', 'TEST'));
        await room.run(() => LobbyService.joinRoom('TEST', 'Guest'));
        let state = await room.run(() => startGame('TEST', mode));
        for (let step = 0; step < 8; step++) {
            const player = state.currentTurn;
            if (state.phase.endsWith('settlement')) {
                const vertex = Object.keys(state.board.vertices).find(id => isValidSetupSettlement(state, id, player))!;
                state = await room.run(() => placeInitialSettlement('TEST', player, vertex));
            } else {
                const edge = Object.keys(state.board.edges).find(id => isValidSetupRoad(state, id, player))!;
                state = await room.run(() => placeInitialRoad('TEST', player, edge));
            }
        }
        const sent = await room.run(() => sendChatMessage('TEST', host.playerId, 'See you next week'));
        expect(sent.success).toBe(true);
        expect(state.phase.startsWith('setup')).toBe(false);
        const snapshot = structuredClone(state);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
        room = new RoomExecution('TEST', storage);
        const restored = await room.run(() => getGameStateByRoomId('TEST'));
        expect(restored?.board).toEqual(snapshot.board);
        expect(restored?.players).toEqual(snapshot.players);
        expect(restored?.phase).toEqual(snapshot.phase);
        expect(restored?.currentTurn).toEqual(snapshot.currentTurn);
        expect(await room.run(() => LobbyService.resolveResumePlayer('TEST', null, 'Host'))).toEqual(host);
        expect(await room.run(() => getRecentMessages('TEST'))).toEqual(expect.arrayContaining([expect.objectContaining({ message: 'See you next week' })]));
        const before = persisted;
        await expect(room.run(() => placeInitialSettlement('TEST', host.playerId, 'invalid'))).rejects.toThrow();
        expect(persisted).toBe(before);
    });
});
