import { describe, expect, it } from 'vitest';
import { getPlayerProductionPreview } from '../production-preview';
import { createTestBoard, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils/test-helpers';

describe('getPlayerProductionPreview', () => {
    it('matches Cities & Knights resource and commodity production rules', () => {
        const player = createTestPlayer({ id: 'p1' });
        const gameState = createTestGameState({
            players: [player],
            gameMode: 'cities_and_knights',
            board: createTestBoard({
                hexes: [
                    {
                        id: '0,0',
                        hex: { q: 0, r: 0, s: 0 },
                        terrain: 'forest',
                        numberToken: 6,
                    },
                ],
                vertices: [
                    createTestVertex({ q: 0, r: 0, d: 0, owner: 'p1', structure: 'city' }),
                ],
            }),
        });

        expect(getPlayerProductionPreview(gameState, 'p1', 6)).toEqual({
            resources: { wood: 1 },
            commodities: { paper: 1 },
        });
    });

    it('omits robber-blocked production', () => {
        const player = createTestPlayer({ id: 'p1' });
        const gameState = createTestGameState({
            players: [player],
            robberHexId: '0,0',
            board: createTestBoard({
                hexes: [{
                    id: '0,0',
                    hex: { q: 0, r: 0, s: 0 },
                    terrain: 'forest',
                    numberToken: 6,
                }],
                vertices: [createTestVertex({ q: 0, r: 0, d: 0, owner: 'p1', structure: 'settlement' })],
            }),
        });

        expect(getPlayerProductionPreview(gameState, 'p1', 6)).toEqual({
            resources: {},
            commodities: {},
        });
    });
});
