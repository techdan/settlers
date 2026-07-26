import { describe, expect, it, vi, beforeEach } from 'vitest';
import { tradeWithBank, offerTrade, acceptTrade, rejectTrade } from '../trading-service';
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
            expect(result.tradeOffer?.rejectedBy).toEqual([]);
        });

        it('throws if insufficient resources to offer', async () => {
            await expect(offerTrade('room-1', 'p1', { sheep: 1, wood: 0, brick: 0, wheat: 0, ore: 0 }, { brick: 1, wood: 0, sheep: 0, wheat: 0, ore: 0 }))
                .rejects.toThrow('Not enough sheep to offer');
        });

        it('creates a trade offer with commodities', async () => {
            mockGameState.players[0].commodities = { paper: 2, cloth: 1, coin: 0 };
            const result = await offerTrade(
                'room-1',
                'p1',
                { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                { brick: 1, wood: 0, sheep: 0, wheat: 0, ore: 0 },
                { paper: 1, cloth: 0, coin: 0 }, // giving commodities
                { cloth: 1, paper: 0, coin: 0 }  // getting commodities
            );

            expect(result.tradeOffer).toBeDefined();
            expect(result.tradeOffer?.giveCommodities).toEqual({ paper: 1, cloth: 0, coin: 0 });
            expect(result.tradeOffer?.getCommodities).toEqual({ cloth: 1, paper: 0, coin: 0 });
        });

        it('throws if insufficient commodities to offer', async () => {
            mockGameState.players[0].commodities = { paper: 0, cloth: 0, coin: 0 };
            await expect(
                offerTrade(
                    'room-1',
                    'p1',
                    { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    { brick: 0, wood: 0, sheep: 0, wheat: 0, ore: 0 },
                    { paper: 1, cloth: 0, coin: 0 },
                    undefined
                )
            ).rejects.toThrow('Not enough paper to offer');
        });

        it('throws if trying to give away resources for nothing (official Catan rules)', async () => {
            await expect(
                offerTrade(
                    'room-1',
                    'p1',
                    { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, // Getting nothing
                )
            ).rejects.toThrow('Both players must exchange at least one resource or commodity');
        });

        it('throws if trying to receive resources for nothing (official Catan rules)', async () => {
            await expect(
                offerTrade(
                    'room-1',
                    'p1',
                    { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, // Giving nothing
                    { brick: 1, wood: 0, sheep: 0, wheat: 0, ore: 0 },
                )
            ).rejects.toThrow('Both players must exchange at least one resource or commodity');
        });

        it('throws if both giving and getting are zero', async () => {
            await expect(
                offerTrade(
                    'room-1',
                    'p1',
                    { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                    { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                )
            ).rejects.toThrow('Both players must exchange at least one resource or commodity');
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
                status: 'open',
                rejectedBy: []
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

        it('sets lastTrade property for UI notifications', async () => {
            const result = await acceptTrade('room-1', 'p2');

            expect(result.lastTrade).toBeDefined();
            expect(result.lastTrade?.initiatorId).toBe('p1');
            expect(result.lastTrade?.acceptorId).toBe('p2');
            expect(result.lastTrade?.initiatorGave.resources).toEqual({ wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 });
            expect(result.lastTrade?.initiatorReceived.resources).toEqual({ ore: 1, wood: 0, brick: 0, sheep: 0, wheat: 0 });
            expect(result.lastTrade?.timestamp).toBeDefined();
        });

        it('executes trade with commodities between players', async () => {
            mockGameState.players[0].commodities = { paper: 2, cloth: 0, coin: 0 };
            mockGameState.players[1].commodities = { paper: 0, cloth: 1, coin: 0 };

            mockGameState.tradeOffer = {
                id: 'trade-2',
                initiator: 'p1',
                give: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                get: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                giveCommodities: { paper: 1, cloth: 0, coin: 0 },
                getCommodities: { cloth: 1, paper: 0, coin: 0 },
                status: 'open',
                rejectedBy: []
            };

            const result = await acceptTrade('room-1', 'p2');

            // p1: -1 paper, +1 cloth
            expect(result.players[0].commodities?.paper).toBe(1);
            expect(result.players[0].commodities?.cloth).toBe(1);

            // p2: -1 cloth, +1 paper
            expect(result.players[1].commodities?.paper).toBe(1);
            expect(result.players[1].commodities?.cloth).toBe(0);

            expect(result.tradeOffer).toBeNull();
        });
    });

    describe('rejectTrade', () => {
        beforeEach(async () => {
            mockGameState = createTestGameState({
                id: 'game-1',
                players: [
                    createTestPlayer({ id: 'p1', name: 'Player 1' }),
                    createTestPlayer({ id: 'p2', name: 'Player 2' }),
                    createTestPlayer({ id: 'p3', name: 'Player 3' }),
                ],
                currentTurn: 'p1',
                phase: 'main_phase'
            });
            // Setup open trade
            mockGameState.tradeOffer = {
                id: 'trade-1',
                initiator: 'p1',
                give: { wood: 1, brick: 0, sheep: 0, wheat: 0, ore: 0 },
                get: { ore: 1, wood: 0, brick: 0, sheep: 0, wheat: 0 },
                status: 'open',
                rejectedBy: []
            };
            vi.mocked(getGameStateByRoomId).mockResolvedValue(mockGameState);
        });

        it('adds player to rejectedBy array when rejecting', async () => {
            const result = await rejectTrade('room-1', 'p2');

            expect(result.tradeOffer).toBeDefined();
            expect(result.tradeOffer?.rejectedBy).toEqual(['p2']);
            expect(result.tradeOffer?.status).toBe('open');
        });

        it('keeps the offer open while another player can still accept', async () => {
            mockGameState.players.push(createTestPlayer({ id: 'p4', name: 'Player 4' }));

            await rejectTrade('room-1', 'p2');
            const result = await rejectTrade('room-1', 'p3');

            expect(result.tradeOffer).not.toBeNull();
            expect(result.tradeOffer?.rejectedBy).toEqual(['p2', 'p3']);
            expect(result.tradeOffer?.status).toBe('open');
        });

        it('auto-cancels the offer once every responder has rejected', async () => {
            await rejectTrade('room-1', 'p2');
            const result = await rejectTrade('room-1', 'p3');

            expect(result.tradeOffer).toBeNull();

            const cancelLog = result.logs.at(-1);
            expect(cancelLog?.message).toBe("All players rejected Player 1's trade offer.");
            // Public notice — no playerId scope, so every client sees it.
            expect(cancelLog?.playerId).toBeUndefined();
        });

        it('does not duplicate rejections from same player', async () => {
            await rejectTrade('room-1', 'p2');
            const result = await rejectTrade('room-1', 'p2');

            expect(result.tradeOffer).toBeDefined();
            expect(result.tradeOffer?.rejectedBy).toEqual(['p2']);
        });

        it('logs rejection message to initiator', async () => {
            const result = await rejectTrade('room-1', 'p2');

            const rejectLog = result.logs.find(log => log.message.includes('rejected'));
            expect(rejectLog).toBeDefined();
            expect(rejectLog?.playerId).toBe('p1'); // Message is for the initiator
            expect(rejectLog?.message).toContain('Player 2 rejected');
        });

        it('throws error if initiator tries to reject', async () => {
            await expect(rejectTrade('room-1', 'p1'))
                .rejects.toThrow('Trade initiator should cancel instead of rejecting');
        });
    });
});
