import { EMPTY_DICE_STATS, EMPTY_EVENT_DIE_STATS, GameState } from '@/lib/types/game';
import { BoardState, Edge, Vertex } from '@/lib/types/board';
import { PlayerColor, PlayerState } from '@/lib/types/player';
import { ResourceType } from '@/core/rules/board-constants';
import { DevCardType } from '@/lib/types';
import { getCanonicalEdgeId, getCanonicalVertexId, getEdgeEndpoints } from '@/lib/hex';
import { CK_CONSTANTS, MetropolisType } from '@/core/rules/commodity-constants';

type EdgeInput = Partial<Edge> & { q?: number; r?: number; d?: number; id?: string };
type VertexInput = Partial<Vertex> & { q?: number; r?: number; d?: number; id?: string };

const DEFAULT_COLOR: PlayerColor = '#ff0000';

const emptyResources = (): Record<ResourceType, number> => ({
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
});

const emptyDevCards = (): Record<DevCardType, number> => ({
    knight: 0,
    victory_point: 0,
    road_building: 0,
    year_of_plenty: 0,
    monopoly: 0,
});

const createMetropolisState = () =>
    ({
        science: { type: 'science', owner: null, vertexId: null },
        trade: { type: 'trade', owner: null, vertexId: null },
        politics: { type: 'politics', owner: null, vertexId: null },
    }) satisfies Record<MetropolisType, { type: MetropolisType; owner: string | null; vertexId: string | null }>;

const parseVertexId = (vertexId: string): [number, number, number] => {
    const [q, r, d] = vertexId.split(',').map(Number);
    return [q, r, d];
};

/**
 * Create a test vertex with sensible defaults.
 */
export function createTestVertex(overrides: VertexInput = {}): Vertex {
    const q = overrides.q ?? 0;
    const r = overrides.r ?? 0;
    const d = overrides.d ?? 0;
    const id = overrides.id ?? getCanonicalVertexId(q, r, d);

    const vertex: Vertex = {
        id,
        q,
        r,
        d,
        owner: null,
        structure: null,
        hasCityWall: false,
        ...overrides,
    };
    vertex.id = id; // ensure id matches coordinates if overridden
    return vertex;
}

/**
 * Create a test edge with sensible defaults.
 */
export function createTestEdge(overrides: EdgeInput = {}): Edge {
    const q = overrides.q ?? 0;
    const r = overrides.r ?? 0;
    const d = overrides.d ?? 0;
    const id = overrides.id ?? getCanonicalEdgeId(q, r, d);

    const edge: Edge = {
        id,
        q,
        r,
        d,
        owner: null,
        structure: null,
        ...overrides,
    };
    edge.id = id; // ensure id is canonical
    return edge;
}

/**
 * Create a simple board for testing.
 * Automatically ensures vertices exist for any provided edges.
 */
export function createTestBoard(config: { vertices?: VertexInput[]; edges?: EdgeInput[]; hexes?: any[] } = {}): BoardState {
    const vertexRecords: Record<string, Vertex> = {};
    const edgeRecords: Record<string, Edge> = {};

    for (const vertexInput of config.vertices ?? []) {
        const vertex = createTestVertex(vertexInput);
        vertexRecords[vertex.id] = vertex;
    }

    const ensureVertex = (vertexId: string) => {
        if (!vertexRecords[vertexId]) {
            const [vq, vr, vd] = parseVertexId(vertexId);
            vertexRecords[vertexId] = createTestVertex({ id: vertexId, q: vq, r: vr, d: vd });
        }
    };

    for (const edgeInput of config.edges ?? []) {
        const edge = createTestEdge(edgeInput);
        edgeRecords[edge.id] = edge;

        const [v1, v2] = getEdgeEndpoints(edge.q, edge.r, edge.d);
        ensureVertex(v1);
        ensureVertex(v2);
    }

    return {
        hexes: config.hexes ?? [],
        vertices: vertexRecords,
        edges: edgeRecords,
    };
}

/**
 * Create a minimal PlayerState for testing.
 */
export function createTestPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
    return {
        id: 'player-1',
        name: 'Test Player',
        color: DEFAULT_COLOR,
        resources: emptyResources(),
        devCards: emptyDevCards(),
        settlementsRemaining: 5,
        citiesRemaining: 4,
        roadsRemaining: 15,
        victoryPoints: 0,
        knightsPlayed: 0,
        hasPlayedDevCard: false,
        devCardsBoughtThisTurn: [],
        commodities: { paper: 0, cloth: 0, coin: 0 },
        improvements: { science: 0, trade: 0, politics: 0 },
        progressCards: [],
        revealedVPCards: [],
        knights: [],
        metropolisOwned: [],
        activeKnightCount: 0,
        defenderVPTokens: 0,
        ...overrides,
    };
}

/**
 * Create a minimal GameState for testing.
 */
export function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    const players = overrides.players ?? [createTestPlayer()];
    const board = overrides.board ?? createTestBoard();
    const turnOrder = overrides.turnOrder ?? players.map(p => p.id);

    return {
        id: overrides.id ?? 'game-1',
        roomId: overrides.roomId ?? 'room-1',
        players,
        board,
        currentTurn: overrides.currentTurn ?? players[0].id,
        turnOrder,
        phase: overrides.phase ?? 'main_phase',
        winner: overrides.winner ?? null,
        lastPlacedSettlementId: overrides.lastPlacedSettlementId ?? null,
        robberHexId: overrides.robberHexId ?? null,
        diceRoll: overrides.diceRoll,
        diceStats: overrides.diceStats ?? { ...EMPTY_DICE_STATS },
        eventDieStats: overrides.eventDieStats ?? { ...EMPTY_EVENT_DIE_STATS },
        devCardDeck: overrides.devCardDeck ?? [],
        tradeOffer: overrides.tradeOffer ?? null,
        longestRoadOwner: overrides.longestRoadOwner ?? null,
        longestRoadLength: overrides.longestRoadLength ?? 0,
        largestArmyOwner: overrides.largestArmyOwner ?? null,
        logs: overrides.logs ?? [],
        gameMode: overrides.gameMode ?? 'cities_and_knights',
        barbarianPosition: overrides.barbarianPosition ?? 0,
        hasBarbariansAttacked: overrides.hasBarbariansAttacked ?? false,
        metropolises: overrides.metropolises ?? createMetropolisState(),
        progressDecks: overrides.progressDecks ?? { science: [], trade: [], politics: [] },
        eventDieRoll: overrides.eventDieRoll,
        merchantHexId: overrides.merchantHexId ?? null,
        activeMerchant: overrides.activeMerchant ?? null,
        activeEffects: overrides.activeEffects ?? [],
        pendingDisplacement: overrides.pendingDisplacement,
        pendingDefenderCardDraws: overrides.pendingDefenderCardDraws,
        pendingAqueduct: overrides.pendingAqueduct,
        pendingBarbarianVictims: overrides.pendingBarbarianVictims,
        pendingCommercialHarbor: overrides.pendingCommercialHarbor,
        pendingWedding: overrides.pendingWedding,
        lastTheft: overrides.lastTheft,
        theftEvents: overrides.theftEvents,
        lastVPCardGain: overrides.lastVPCardGain,
        discardContext: overrides.discardContext,
    };
}
