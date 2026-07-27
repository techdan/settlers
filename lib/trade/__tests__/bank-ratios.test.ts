import { describe, expect, it } from 'vitest';
import { createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils/test-helpers';
import { createHex, getCanonicalVertexId } from '@/lib/hex';
import { getPortForVertex, type PortType } from '@/core/engine/board/port-generator';
import { getBankTradeRatio, getBankTradeRatios } from '../bank-ratios';
import type { BoardHex } from '@/lib/types/board';
import type { Vertex } from '@/lib/types/board';

/**
 * Port positions are fixed board geometry, so rather than hardcode vertex IDs that
 * would rot if the coastline moves, we ask the generator which vertex carries which
 * port and build the fixture from the answer.
 */
function findPortVertex(portType: PortType): string {
    for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
            for (let d = 0; d < 6; d++) {
                const id = getCanonicalVertexId(q, r, d);
                if (getPortForVertex(id) === portType) return id;
            }
        }
    }
    throw new Error(`No vertex carries a ${portType} port`);
}

function findNonPortVertex(): string {
    for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
            for (let d = 0; d < 6; d++) {
                const id = getCanonicalVertexId(q, r, d);
                if (getPortForVertex(id) === null) return id;
            }
        }
    }
    throw new Error('Every vertex carries a port');
}

/** A board whose only vertices are the ones this player owns. */
function boardOwning(vertexIds: string[], owner: string, hexes: BoardHex[] = []) {
    const vertices: Record<string, Vertex> = {};
    for (const id of vertexIds) {
        const [q, r, d] = id.split(',').map(Number);
        vertices[id] = createTestVertex({ id, q, r, d, owner, structure: 'settlement' });
    }
    return { hexes, vertices, edges: {} };
}

const PASTURE_HEX: BoardHex = {
    id: 'hex-pasture',
    hex: createHex(0, 0),
    terrain: 'pasture',
    numberToken: 6,
};

describe('getBankTradeRatio', () => {
    it('charges 4:1 without ports or bonuses', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findNonPortVertex()], player.id),
        });

        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(4);
    });

    it('charges 3:1 on a generic port', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findPortVertex('generic')], player.id),
        });

        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(3);
    });

    it('charges 2:1 on a matching resource port but not on other resources', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findPortVertex('wood')], player.id),
        });

        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(2);
        expect(getBankTradeRatio(gameState, player.id, 'ore')).toBe(4);
    });

    it('ignores ports owned by other players', () => {
        const player = createTestPlayer();
        const rival = createTestPlayer({ id: 'player-2', name: 'Rival' });
        const gameState = createTestGameState({
            players: [player, rival],
            board: boardOwning([findPortVertex('wood')], rival.id),
        });

        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(4);
    });

    it('charges 4:1 for commodities until a Trading House is built', () => {
        const player = createTestPlayer({ improvements: { science: 0, trade: 2, politics: 0 } });
        const gameState = createTestGameState({ players: [player] });

        expect(getBankTradeRatio(gameState, player.id, 'paper')).toBe(4);
    });

    it('charges 2:1 for commodities at Trade level 3', () => {
        const player = createTestPlayer({ improvements: { science: 0, trade: 3, politics: 0 } });
        const gameState = createTestGameState({ players: [player] });

        expect(getBankTradeRatio(gameState, player.id, 'coin')).toBe(2);
    });

    it('never applies a resource port to a commodity', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findPortVertex('generic')], player.id),
        });

        expect(getBankTradeRatio(gameState, player.id, 'cloth')).toBe(4);
    });

    it('gives the active Merchant 2:1 on the resource it sits on', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findNonPortVertex()], player.id, [PASTURE_HEX]),
            activeMerchant: player.id,
            merchantHexId: PASTURE_HEX.id,
        });

        expect(getBankTradeRatio(gameState, player.id, 'sheep')).toBe(2);
        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(4);
    });

    it('does not give the Merchant discount to a player who does not hold it', () => {
        const player = createTestPlayer();
        const rival = createTestPlayer({ id: 'player-2', name: 'Rival' });
        const gameState = createTestGameState({
            players: [player, rival],
            board: boardOwning([findNonPortVertex()], player.id, [PASTURE_HEX]),
            activeMerchant: rival.id,
            merchantHexId: PASTURE_HEX.id,
        });

        expect(getBankTradeRatio(gameState, player.id, 'sheep')).toBe(4);
    });

    it('applies Merchant Fleet to its named item, including commodities', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            activeEffects: [{ type: 'merchant_fleet', playerId: player.id, tradeItem: 'cloth' }],
        });

        expect(getBankTradeRatio(gameState, player.id, 'cloth')).toBe(2);
        expect(getBankTradeRatio(gameState, player.id, 'paper')).toBe(4);
    });

    it('does not leak another player\'s Merchant Fleet', () => {
        const player = createTestPlayer();
        const rival = createTestPlayer({ id: 'player-2', name: 'Rival' });
        const gameState = createTestGameState({
            players: [player, rival],
            activeEffects: [{ type: 'merchant_fleet', playerId: rival.id, tradeItem: 'wood' }],
        });

        expect(getBankTradeRatio(gameState, player.id, 'wood')).toBe(4);
    });
});

describe('getBankTradeRatios', () => {
    it('returns a ratio for every tradeable item', () => {
        const player = createTestPlayer();
        const gameState = createTestGameState({
            players: [player],
            board: boardOwning([findPortVertex('wood')], player.id),
        });

        const ratios = getBankTradeRatios(gameState, player.id);

        expect(Object.keys(ratios).sort()).toEqual(
            ['brick', 'cloth', 'coin', 'ore', 'paper', 'sheep', 'wheat', 'wood']
        );
        expect(ratios.wood).toBe(2);
        expect(ratios.brick).toBe(4);
    });
});
