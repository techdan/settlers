import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyService } from '@/lib/services/lobby-service';
import * as roomRepository from '@/lib/repositories/room-repository';
import * as playerRepository from '@/lib/repositories/player-repository';
import type { LobbyState } from '@/lib/types/lobby';

vi.mock('@/lib/repositories/room-repository', () => ({
    createRoom: vi.fn(),
    findRoomById: vi.fn(),
}));

vi.mock('@/lib/repositories/player-repository', () => ({
    createPlayer: vi.fn(),
    findPlayersByRoomId: vi.fn(),
    findPlayerByName: vi.fn(),
}));

describe('LobbyService room lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates a room, host player, and standard board as one service operation', async () => {
        vi.mocked(roomRepository.createRoom).mockResolvedValue({} as never);
        vi.mocked(playerRepository.createPlayer).mockResolvedValue({} as never);
        const setStandardBoard = vi
            .spyOn(LobbyService, 'setStandardBoard')
            .mockResolvedValue({} as LobbyState);

        const result = await LobbyService.createRoom('Pa');

        expect(result.roomId).toMatch(/^[A-Z]{4}$/);
        expect(result.playerId).toMatch(/^[0-9a-f-]{36}$/);
        expect(roomRepository.createRoom).toHaveBeenCalledWith(result.roomId);
        expect(playerRepository.createPlayer).toHaveBeenCalledWith(
            result.playerId,
            result.roomId,
            'Pa',
            true
        );
        expect(setStandardBoard).toHaveBeenCalledWith(result.roomId, result.playerId);
    });

    it('normalizes room codes and returns only public player summaries', async () => {
        vi.mocked(roomRepository.findRoomById).mockResolvedValue({ id: 'ABCD' } as never);
        vi.mocked(playerRepository.findPlayersByRoomId).mockResolvedValue([
            { id: 'p1', name: 'Pa', isHost: true },
            { id: 'p2', name: 'Pb', isHost: false },
        ] as never);

        const result = await LobbyService.getRoomPlayerSummaries('abcd');

        expect(roomRepository.findRoomById).toHaveBeenCalledWith('ABCD');
        expect(playerRepository.findPlayersByRoomId).toHaveBeenCalledWith('ABCD');
        expect(result).toEqual([
            { id: 'p1', name: 'Pa' },
            { id: 'p2', name: 'Pb' },
        ]);
    });

    it('resolves a returning player by name when no player ID is supplied', async () => {
        vi.mocked(roomRepository.findRoomById).mockResolvedValue({ id: 'ROOM' } as never);
        vi.mocked(playerRepository.findPlayerByName).mockResolvedValue({ id: 'p2', name: 'Pb' } as never);

        await expect(LobbyService.resolveResumePlayer('room', null, 'Pb')).resolves.toEqual({
            roomId: 'ROOM',
            playerId: 'p2',
        });
        expect(playerRepository.findPlayerByName).toHaveBeenCalledWith('ROOM', 'Pb');
    });

    it('joins an existing room with a normalized code', async () => {
        vi.mocked(roomRepository.findRoomById).mockResolvedValue({ id: 'ROOM' } as never);
        vi.mocked(playerRepository.createPlayer).mockResolvedValue({} as never);

        const result = await LobbyService.joinRoom('room', 'Pa');

        expect(result.roomId).toBe('ROOM');
        expect(playerRepository.createPlayer).toHaveBeenCalledWith(result.playerId, 'ROOM', 'Pa');
    });

    it('preserves the existing room-not-found validation message', async () => {
        vi.mocked(roomRepository.findRoomById).mockResolvedValue(undefined);

        await expect(LobbyService.joinRoom('none', 'Pa')).rejects.toThrow('Room not found');
    });
});
