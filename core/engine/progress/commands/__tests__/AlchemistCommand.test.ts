import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlchemistCommand } from '../AlchemistCommand';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils';
import { GameState } from '@/lib/types';
import { EMPTY_EVENT_DIE_STATS } from '@/lib/types/game';
import { getDiceRollKey } from '@/lib/presentation/dice-events';

// Mock dependencies
vi.mock('@/core/engine/progress/progress-card-definitions', () => ({
    getCardMetadata: () => ({ name: 'Alchemy' })
}));

vi.mock('@/core/engine/dice/event-die-manager', () => ({
    rollEventDie: vi.fn(),
    processEventDieRoll: vi.fn(),
    getCategoryFromColor: vi.fn(),
    getEligiblePlayersForCardDraw: vi.fn(),
}));

vi.mock('@/core/engine/resources/resource-manager', () => ({
    distributeResources: vi.fn(),
    getTotalResources: vi.fn(),
    logDistribution: vi.fn(),
}));

vi.mock('@/core/engine/resources/commodity-manager', () => ({
    distributeCommodities: vi.fn(),
    getTotalCommodities: vi.fn(),
}));

vi.mock('@/core/utils/city-wall-utils', () => ({
    getRobberDiscardThreshold: vi.fn().mockReturnValue(7),
}));

vi.mock('@/core/engine/progress/progress-card-manager', () => ({
    drawProgressCard: vi.fn(),
}));

import * as EventDieManager from '@/core/engine/dice/event-die-manager';
import * as ResourceManager from '@/core/engine/resources/resource-manager';
import * as CommodityManager from '@/core/engine/resources/commodity-manager';

describe('AlchemistCommand', () => {
    let gameState: GameState;
    let command: AlchemistCommand;

    beforeEach(() => {
        vi.clearAllMocks();
        gameState = createTestGameState({
            players: [
                createTestPlayer({ id: 'p1', name: 'Player 1', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
            ],
            gameMode: 'cities_and_knights',
            phase: 'waiting_for_roll'
        });
        gameState.pendingAlchemy = { playerId: 'p1', eventDieFace: 'ship', revealedAt: 123 };
        command = new AlchemistCommand();
    });

    it('executes alchemist with chosen dice', () => {
        vi.mocked(EventDieManager.rollEventDie).mockReturnValue('ship');
        vi.mocked(ResourceManager.getTotalResources).mockReturnValue(0);
        vi.mocked(CommodityManager.getTotalCommodities).mockReturnValue(0);
        vi.mocked(ResourceManager.distributeResources).mockReturnValue({});

        const options = { chosenDice1: 3, chosenDice2: 4 }; // Total 7

        command.execute(gameState, 'p1', options);

        expect(gameState.diceRoll).toEqual({ d1: 3, d2: 4, total: 7 });
        expect(EventDieManager.processEventDieRoll).toHaveBeenCalled();
        expect(gameState.pendingAlchemy).toBeUndefined();
        expect(gameState.phase).toBe('main_phase'); // 7 with no barbarian move -> main phase (if no robber placement logic mocked)

        // Wait, on 7, it handles robber.
        // If not cities_and_knights, phase -> robber_placement.
        // In C&K, if !hasBarbariansAttacked, robber stays in desert -> main_phase.
        // gameState defaults hasBarbariansAttacked = false.

        expect(gameState.logs.find(l => l.message.includes('played Alchemy'))).toBeDefined();
    });

    it('counts commodities when Alchemy produces a seven', () => {
        vi.mocked(EventDieManager.rollEventDie).mockReturnValue('ship');
        vi.mocked(ResourceManager.getTotalResources).mockReturnValue(5);
        vi.mocked(CommodityManager.getTotalCommodities).mockReturnValue(4);

        command.execute(gameState, 'p1', { chosenDice1: 3, chosenDice2: 4 });

        expect(gameState.phase).toBe('discarding');
        expect(gameState.discardContext).toEqual({ type: 'robber' });
        expect(gameState.lastProduction?.diceTotal).toBe(7);
        expect(gameState.lastProduction?.gains).toEqual([]);
        expect(gameState.lastProduction?.sources).toEqual([]);
    });

    it('captures selected-dice awards and exact sources from the distribution results', () => {
        gameState.eventDieStats = { ...EMPTY_EVENT_DIE_STATS, ship: 2 };
        vi.mocked(EventDieManager.processEventDieRoll).mockImplementationOnce(state => { state.eventDieStats!.ship++; });
        vi.mocked(ResourceManager.getTotalResources).mockReturnValue(0);
        vi.mocked(CommodityManager.getTotalCommodities).mockReturnValue(0);
        vi.mocked(ResourceManager.distributeResources).mockImplementationOnce((_state, _total, sources) => {
            sources?.push({ hexId: '0,0', playerId: 'p1', kind: 'resource', type: 'wood', amount: 1 });
            return { p1: { wood: 1 } };
        });
        vi.mocked(CommodityManager.distributeCommodities).mockImplementationOnce((_state, _total, sources) => {
            sources?.push({ hexId: '0,0', playerId: 'p1', kind: 'commodity', type: 'paper', amount: 1 });
            return { p1: { paper: 1 } };
        });
        command.execute(gameState, 'p1', { chosenDice1: 3, chosenDice2: 3 });
        expect(gameState.lastProduction?.id).toBe(getDiceRollKey(gameState));
        expect(gameState.lastProduction?.gains).toEqual([{ playerId: 'p1', resources: { wood: 1 }, commodities: { paper: 1 } }]);
        expect(gameState.lastProduction?.sources).toHaveLength(2);
    });

    it('throws if options missing', () => {
        expect(() => command.execute(gameState, 'p1', {})).toThrow('Alchemist requires choosing both dice values');
    });

    it('throws if dice invalid', () => {
        expect(() => command.execute(gameState, 'p1', { chosenDice1: 7, chosenDice2: 1 })).toThrow('Dice values must be between 1 and 6');
    });

    it('throws if not waiting_for_roll', () => {
        gameState.phase = 'main_phase';
        expect(() => command.execute(gameState, 'p1', { chosenDice1: 1, chosenDice2: 1 })).toThrow('Alchemy can only be played before rolling dice');
    });

    it('throws if the event die has not been revealed', () => {
        gameState.pendingAlchemy = undefined;
        expect(() => command.execute(gameState, 'p1', { chosenDice1: 1, chosenDice2: 1 })).toThrow(
            'Alchemy event die must be revealed before choosing dice'
        );
    });
});
