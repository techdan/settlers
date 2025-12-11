import { describe, expect, it, vi, beforeEach } from 'vitest';
import { tradeWithBank, offerTrade, acceptTrade } from '../trading-service';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import * as PortGenerator from '@/core/engine/board/port-generator';
import { getGameStateByRoomId } from '@/lib/repositories/game-repository';

// Mock Repositories
vi.mock('@/lib/repositories/game-repository', () => ({
    getGameStateByRoomId: vi.fn(),
    updateGameState: vi.fn(),
}));

// Mock Port Generator
vi.mock('@/core/engine/board/port-generator', () => ({
    getBestTradeRatio: vi.fn(),
    getPortForVertex: vi.fn(),
}));

describe('Trading Service', () => {
    let mockGameState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGameState = createTestGameState({
            id: 'game-1',
            players: [
                createTestPlayer({
                    id: 'p1',
                    name: 'Player 1',
                    resources: { wood: 10, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    commodities: { paper: 0, cloth: 0, coin: 0 }
                }),
                createTestPlayer({
                    id: 'p2',
                    name: 'Player 2',
                    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 10 }
                }),
            ],
            currentTurn: 'p1',
            phase: 'main_phase'
        });

        vi.mocked(getGameStateByRoomId).mockResolvedValue(mockGameState);
        vi.mocked(PortGenerator.getBestTradeRatio).mockReturnValue(4); // Default 4:1
    });

    describe('tradeWithBank', () => {
        it('trades resources at 4:1 by default', async () => {
            const result = await tradeWithBank('room-1', 'p1', 'wood', 'brick');

            // Should cost 4 wood, gain 1 brick
            expect(result.players[0].resources.wood).toBe(6);
            expect(result.players[0].resources.brick).toBe(1);
        });

        it('respects port ratios', async () => {
            vi.mocked(PortGenerator.getBestTradeRatio).mockReturnValue(2);

            const result = await tradeWithBank('room-1', 'p1', 'wood', 'brick');

            // Should cost 2 wood, gain 1 brick
            expect(result.players[0].resources.wood).toBe(8);
            expect(result.players[0].resources.brick).toBe(1);
        });

        it('throws if insufficient resources', async () => {
            // p1 has 0 sheep
            await expect(tradeWithBank('room-1', 'p1', 'sheep', 'wood'))
                .rejects.toThrow(/Not enough sheep/);
        });

        it('handles commodity trading (e.g. paper)', async () => {
            mockGameState.players[0].commodities!.paper = 4;
            // Best trade ratio mock usually is for resources, commodities are default 4:1 unless Trade Improvement level 3
            // logic in service calls getBestTradeRatio only if NOT commodity.
            // Commodities are checked separately.

            const result = await tradeWithBank('room-1', 'p1', 'paper', 'wood');

            expect(result.players[0].commodities!.paper).toBe(0);
            expect(result.players[0].resources.wood).toBe(11); // Started 10
        });
    });

    describe('offerTrade', () => {
        it('creates a trade offer', async () => {
            const result = await offerTrade('room-1', 'p1', { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 }, { brick: 1, wood: 0, sheep: 0, wheat: 0, ore: 0 });

            expect(result.tradeOffer).toBeDefined();
            expect(result.tradeOffer?.initiator).toBe('p1');
            expect(result.tradeOffer?.status).toBe('open');
        });

        it('throws if insufficient resources to offer', async () => {
            await expect(offerTrade('room-1', 'p1', { sheep: 1, wood: 0, brick: 0, wheat: 0, ore: 0 }, { brick: 1, wood: 0, sheep: 0, wheat: 0, ore: 0 }))
                .rejects.toThrow('Not enough sheep to offer');
        });
    });

    describe('acceptTrade', () => {
        beforeEach(async () => {
            // Setup open trade
            mockGameState.tradeOffer = {
                id: 'trade-1',
                initiator: 'p1',
                give: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                get: { ore: 1, wood: 0, brick: 0, sheep: 0, wheat: 0 }, // p1 wants ore from p2
                status: 'open'
            };
        });

        it('executes trade between players', async () => {
            // p2 accepts
            const result = await acceptTrade('room-1', 'p2');

            // p1: -1 wood, +1 ore -> wood:9, ore:1
            // p2: -1 ore, +1 wood -> ore:9, wood:1

            expect(result.players[0].resources.wood).toBe(9);
            expect(result.players[0].resources.ore).toBe(1);

            expect(result.players[1].resources.ore).toBe(9);
            expect(result.players[1].resources.wood).toBe(1);

            expect(result.tradeOffer).toBeNull();
        });
    });
});
