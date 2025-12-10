import { describe, expect, it } from 'vitest';
import {
    isValidMainPhaseCity,
    isValidMainPhaseRoad,
    isValidMainPhaseSettlement,
} from '../building-validator';
import { isValidSetupRoad, isValidSetupSettlement } from '../setup-validator';
import { createTestBoard, createTestEdge, createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { getAdjacentVertexIds, getCanonicalEdgeId, getCanonicalVertexId, getEdgeEndpoints } from '@/lib/hex';

const PLAYER_ID = 'p1';
const OPPONENT_ID = 'p2';

describe('Building Validators', () => {
    it('allows setup settlement on empty valid vertex', () => {
        const vertexId = getCanonicalVertexId(0, 0, 0);
        const board = createTestBoard({ vertices: [createTestVertex({ id: vertexId })] });
        const gameState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID }), createTestPlayer({ id: OPPONENT_ID })],
            board,
        });

        expect(isValidSetupSettlement(gameState, vertexId, PLAYER_ID)).toBe(true);
    });

    it('rejects setup settlement on occupied or adjacent vertex', () => {
        const targetId = getCanonicalVertexId(0, 0, 0);
        const [adjacentId] = getAdjacentVertexIds(0, 0, 0);

        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: targetId, owner: OPPONENT_ID, structure: 'settlement' }),
                createTestVertex({ id: adjacentId, owner: OPPONENT_ID, structure: 'settlement' }),
            ],
        });

        const gameState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID }), createTestPlayer({ id: OPPONENT_ID })],
            board,
        });

        expect(isValidSetupSettlement(gameState, targetId, PLAYER_ID)).toBe(false);
    });

    it('requires setup roads to connect to last placed settlement', () => {
        const settlementId = getCanonicalVertexId(0, 0, 0);
        const connectedEdge = createTestEdge({ q: 0, r: 0, d: 0 });
        const disconnectedEdge = createTestEdge({ q: 2, r: 0, d: 0 });

        const board = createTestBoard({ vertices: [createTestVertex({ id: settlementId })], edges: [connectedEdge, disconnectedEdge] });

        const gameState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID })],
            board,
            lastPlacedSettlementId: settlementId,
        });

        expect(isValidSetupRoad(gameState, connectedEdge.id, PLAYER_ID)).toBe(true);
        expect(isValidSetupRoad(gameState, disconnectedEdge.id, PLAYER_ID)).toBe(false);
    });

    it('requires roads to be adjacent for main phase settlement', () => {
        const vertexId = getCanonicalVertexId(0, 0, 0);
        const roadEdge = createTestEdge({ q: 0, r: 0, d: 0, owner: PLAYER_ID, structure: 'road' });
        const boardWithRoad = createTestBoard({ vertices: [createTestVertex({ id: vertexId })], edges: [roadEdge] });

        const gameWithRoad = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID })],
            board: boardWithRoad,
        });

        expect(isValidMainPhaseSettlement(gameWithRoad, vertexId, PLAYER_ID)).toBe(true);

        const boardWithoutRoad = createTestBoard({ vertices: [createTestVertex({ id: vertexId })] });
        const gameWithoutRoad = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID })],
            board: boardWithoutRoad,
        });

        expect(isValidMainPhaseSettlement(gameWithoutRoad, vertexId, PLAYER_ID)).toBe(false);
    });

    it('validates main phase road connectivity and blocking', () => {
        const vertexId = getCanonicalVertexId(0, 0, 0);
        const edgeId = getCanonicalEdgeId(0, 0, 0); // connects to vertexId

        const board = createTestBoard({
            vertices: [createTestVertex({ id: vertexId, owner: PLAYER_ID, structure: 'settlement' })],
            edges: [createTestEdge({ id: edgeId, q: 0, r: 0, d: 0 })],
        });

        const gameState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID })],
            board,
        });

        expect(isValidMainPhaseRoad(gameState, edgeId, PLAYER_ID)).toBe(true);

        // Opponent buildings on both endpoints block connection
        const blockedEdgeId = getCanonicalEdgeId(1, 1, 0);
        const [blockedVertexA, blockedVertexB] = getEdgeEndpoints(1, 1, 0);
        const [v1q, v1r, v1d] = blockedVertexA.split(',').map(Number);
        const [v2q, v2r, v2d] = blockedVertexB.split(',').map(Number);
        const blockedBoard = createTestBoard({
            vertices: [
                createTestVertex({ id: blockedVertexA, q: v1q, r: v1r, d: v1d, owner: OPPONENT_ID, structure: 'settlement' }),
                createTestVertex({ id: blockedVertexB, q: v2q, r: v2r, d: v2d, owner: OPPONENT_ID, structure: 'settlement' }),
            ],
            edges: [createTestEdge({ id: blockedEdgeId, q: 1, r: 1, d: 0 })],
        });
        const blockedState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID }), createTestPlayer({ id: OPPONENT_ID })],
            board: blockedBoard,
        });

        expect(isValidMainPhaseRoad(blockedState, blockedEdgeId, PLAYER_ID)).toBe(false);
    });

    it('allows city upgrade only from own settlement', () => {
        const vertexId = getCanonicalVertexId(0, 0, 0);
        const board = createTestBoard({
            vertices: [
                createTestVertex({ id: vertexId, owner: PLAYER_ID, structure: 'settlement' }),
                createTestVertex({ id: '1,0,0', owner: OPPONENT_ID, structure: 'settlement' }),
            ],
        });

        const gameState = createTestGameState({
            players: [createTestPlayer({ id: PLAYER_ID }), createTestPlayer({ id: OPPONENT_ID })],
            board,
        });

        expect(isValidMainPhaseCity(gameState, vertexId, PLAYER_ID)).toBe(true);
        expect(isValidMainPhaseCity(gameState, '1,0,0', PLAYER_ID)).toBe(false);
    });
});
