import { describe, expect, it } from 'vitest';
import {
    advanceBarbarian,
    loseCityToBarbarians,
    resetBarbarianPosition,
    resolveBarbbarianAttack,
} from '../barbarian-manager';
import { createTestBoard, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { Knight } from '@/lib/types/player';

const buildKnight = (owner: string, vertexId: string, level: Knight['level'], active = true): Knight => ({
    id: `${owner}-${vertexId}-${level}`,
    vertexId,
    playerId: owner,
    level,
    active,
});

describe('Barbarian Manager', () => {
    it('advances and resets barbarian position', () => {
        const gameState = createTestGameState({ barbarianPosition: 2 });

        expect(advanceBarbarian(gameState)).toBe(3);
        expect(gameState.barbarianPosition).toBe(3);

        resetBarbarianPosition(gameState);
        expect(gameState.barbarianPosition).toBe(0);
    });

    it('awards defender VP token to strongest contributor when defenders win', () => {
        const p1 = createTestPlayer({
            id: 'p1',
            name: 'Player 1',
            knights: [buildKnight('p1', '0,0,0', 'strong'), buildKnight('p1', '0,0,1', 'basic')],
        });
        const p2 = createTestPlayer({
            id: 'p2',
            name: 'Player 2',
            color: '#0000ff',
            knights: [buildKnight('p2', '1,0,0', 'basic')],
        });

        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' }),
                createTestVertex({ id: '0,0,1', owner: 'p2', structure: 'city' }),
                createTestVertex({ id: '0,0,2', owner: 'p2', structure: 'city' }),
            ],
        });

        const gameState = createTestGameState({
            players: [p1, p2],
            board,
            barbarianPosition: 7,
        });

        resolveBarbbarianAttack(gameState);

        expect(p1.defenderVPTokens).toBe(1);
        expect(gameState.pendingDefenderCardDraws).toBeUndefined();
        expect(gameState.barbarianPosition).toBe(0);
        expect(gameState.phase).toBe('main_phase');
        expect(p1.knights?.every(k => !k.active)).toBe(true);
        expect(p2.knights?.every(k => !k.active)).toBe(true);
    });

    it('queues progress card draws when defenders tie', () => {
        const p1 = createTestPlayer({
            id: 'p1',
            knights: [buildKnight('p1', '0,0,0', 'basic')],
        });
        const p2 = createTestPlayer({
            id: 'p2',
            color: '#0000ff',
            knights: [buildKnight('p2', '0,0,1', 'basic')],
        });

        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' }),
                createTestVertex({ id: '0,0,1', owner: 'p2', structure: 'city' }),
            ],
        });

        const gameState = createTestGameState({
            players: [p1, p2],
            board,
            barbarianPosition: 7,
        });

        resolveBarbbarianAttack(gameState);

        expect(p1.defenderVPTokens).toBe(0);
        expect(gameState.pendingDefenderCardDraws).toEqual(['p1', 'p2']);
        expect(gameState.barbarianPosition).toBe(0);
        expect(gameState.phase).toBe('main_phase');
        expect(p1.knights?.every(k => !k.active)).toBe(true);
        expect(p2.knights?.every(k => !k.active)).toBe(true);
    });

    it('selects weakest defenders to lose cities when barbarians win', () => {
        const p1 = createTestPlayer({ id: 'p1', name: 'Player 1' });
        const p2 = createTestPlayer({ id: 'p2', name: 'Player 2', color: '#0000ff' });

        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' }),
                createTestVertex({ id: '0,0,1', owner: 'p2', structure: 'city' }),
            ],
        });

        const gameState = createTestGameState({
            players: [p1, p2],
            board,
            barbarianPosition: 7,
        });

        resolveBarbbarianAttack(gameState);

        expect(gameState.pendingBarbarianVictims).toEqual(expect.arrayContaining(['p1', 'p2']));
        expect(gameState.phase).toBe('barbarian_city_selection');
        expect(gameState.barbarianPosition).toBe(7); // reset happens after cities chosen
    });

    it('resets immediately when no destroyable cities exist', () => {
        const p1 = createTestPlayer({ id: 'p1', name: 'Player 1' });
        const p2 = createTestPlayer({ id: 'p2', name: 'Player 2', color: '#0000ff' });

        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'metropolis' }),
                createTestVertex({ id: '0,0,1', owner: 'p2', structure: 'settlement' }),
            ],
        });

        const gameState = createTestGameState({
            players: [p1, p2],
            board,
            barbarianPosition: 7,
        });

        resolveBarbbarianAttack(gameState);

        expect(gameState.pendingBarbarianVictims).toBeUndefined();
        expect(gameState.barbarianPosition).toBe(0);
        expect(gameState.phase).toBe('main_phase');
    });

    it('destroys selected city and finalizes attack when victim chooses', () => {
        const city = createTestVertex({ id: '0,0,0', owner: 'p1', structure: 'city' });
        const p1 = createTestPlayer({
            id: 'p1',
            name: 'Player 1',
            citiesRemaining: 3,
            settlementsRemaining: 5,
            knights: [buildKnight('p1', '1,0,0', 'basic')],
        });

        const gameState = createTestGameState({
            players: [p1],
            board: createTestBoard({ vertices: [city] }),
            barbarianPosition: 7,
            phase: 'barbarian_city_selection',
            pendingBarbarianVictims: ['p1'],
        });

        loseCityToBarbarians(gameState, 'p1', city.id);

        expect(gameState.board.vertices[city.id].structure).toBe('settlement');
        expect(p1.citiesRemaining).toBe(4);
        expect(p1.settlementsRemaining).toBe(4);
        expect(gameState.pendingBarbarianVictims).toBeUndefined();
        expect(gameState.barbarianPosition).toBe(0);
        expect(gameState.phase).toBe('main_phase');
        expect(p1.knights?.every(k => !k.active)).toBe(true);
    });
});
