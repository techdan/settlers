import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GameState } from '@/lib/types';
import { EngineerCommand } from '../EngineerCommand';
import { SmithCommand } from '../SmithCommand';
import { RoadBuildingCommand } from '../RoadBuildingCommand';
import { createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import * as KnightUpgradeUtils from '@/core/utils/knight-upgrade-utils';
import * as KnightManager from '@/core/engine/knights/knight-manager';
import * as CityWallValidator from '@/core/validation/city-wall-validator';

vi.mock('@/core/utils/knight-upgrade-utils', () => ({
    isKnightPromotable: vi.fn(),
}));

vi.mock('@/core/engine/knights/knight-manager', () => ({
    upgradeKnight: vi.fn(),
}));

vi.mock('@/core/validation/city-wall-validator', () => ({
    canBuildCityWall: vi.fn(),
}));

describe('Simple Science Commands', () => {
    let gameState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        gameState = createTestGameState({
            players: [createTestPlayer({ id: 'p1', name: 'Player 1' })],
            gameMode: 'cities_and_knights'
        });
    });

    describe('RoadBuildingCommand', () => {
        it('activates road building active effect', () => {
            const cmd = new RoadBuildingCommand();
            cmd.execute(gameState, 'p1');

            expect(gameState.activeEffects).toBeDefined();
            expect(gameState.activeEffects![0]).toMatchObject({
                type: 'road_building_progress',
                playerId: 'p1',
                placedEdges: []
            });
            expect(gameState.phase).toBe('road_building_1');
        });

        it('throws if player not found', () => {
            const cmd = new RoadBuildingCommand();
            expect(() => cmd.execute(gameState, 'unknown')).toThrow('Player not found');
        });
    });

    describe('SmithCommand', () => {
        it('upgrades valid knights', () => {
            const cmd = new SmithCommand();
            const player = gameState.players[0];
            player.knights = [{ id: 'k1', level: 'basic', vertexId: 'v1', playerId: 'p1', active: false }];

            vi.mocked(KnightUpgradeUtils.isKnightPromotable).mockReturnValue(true);

            cmd.execute(gameState, 'p1', { knightIds: ['k1'] });

            expect(KnightManager.upgradeKnight).toHaveBeenCalledWith(gameState, 'k1');
        });

        it('throws if no knights selected', () => {
            const cmd = new SmithCommand();
            expect(() => cmd.execute(gameState, 'p1', {})).toThrow('requires selecting at least one');
        });

        it('throws if too many knights selected', () => {
            const cmd = new SmithCommand();
            expect(() => cmd.execute(gameState, 'p1', { knightIds: ['k1', 'k2', 'k3'] })).toThrow('at most two');
        });
    });

    describe('EngineerCommand', () => {
        beforeEach(() => {
            gameState.board.vertices['v1'] = createTestVertex({ id: 'v1', owner: 'p1', structure: 'city' });
        });

        it('builds city wall on valid city', () => {
            const cmd = new EngineerCommand();
            vi.mocked(CityWallValidator.canBuildCityWall).mockReturnValue(true);

            cmd.execute(gameState, 'p1', { vertexId: 'v1' });

            expect(gameState.board.vertices['v1'].hasCityWall).toBe(true);
            expect(gameState.logs.find((l: any) => l.message.includes('built a city wall'))).toBeDefined();
        });

        it('throws if city not eligible', () => {
            const cmd = new EngineerCommand();
            vi.mocked(CityWallValidator.canBuildCityWall).mockReturnValue(false);

            expect(() => cmd.execute(gameState, 'p1', { vertexId: 'v1' })).toThrow('not eligible');
        });

        it('throws if vertex not provided', () => {
            const cmd = new EngineerCommand();
            expect(() => cmd.execute(gameState, 'p1', {})).toThrow('requires selecting a city');
        });
    });
});
