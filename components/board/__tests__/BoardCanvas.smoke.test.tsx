import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { createTestGameState, createTestPlayer, createTestVertex, createTestEdge } from '@/lib/test-utils';
import { generateStandardBoard } from '@/core/engine/board/board-generator';
import { generatePorts } from '@/core/engine/board/port-generator';
import { createHex, hexCornerToPixel, hexEdgeToPixel } from '@/lib/hex';
import type { Knight } from '@/lib/types/player';
import type { BoardSelectionState } from '@/lib/types/board-selection-state';

/**
 * Board smoke tests (single-theme board).
 *
 * These are the regression safety net for the graphics-overhaul Phase 0 work
 * (3D-theme retirement, sprite pipeline, palette module, piece path extraction).
 * They assert on stable, behavior-level signals (element counts, owner-color
 * strings, transform-computed positions, tooltip text) rather than exact
 * internal markup, so they should keep passing across those refactors while
 * still catching real regressions.
 */

// react-zoom-pan-pinch unconditionally calls `new ResizeObserver(...)` when the
// TransformWrapper initializes. jsdom does not implement ResizeObserver, so we
// stub it here (scoped to this test file only).
class ResizeObserverStub {
    observe() { }
    unobserve() { }
    disconnect() { }
}
if (typeof (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

const HEX_SIZE = 90;

const PLAYER_COLOR = '#ff0000';
const PLAYER_COLOR_VAR = 'var(--color-player-1)';

function buildFixture() {
    const hexes = generateStandardBoard();

    // Spread across far corners of the board so pixel positions can never collide.
    const settlementVertex = createTestVertex({ id: 'v-settlement', q: 0, r: -2, d: 0, owner: 'p1', structure: 'settlement' });
    const cityVertex = createTestVertex({ id: 'v-city', q: 2, r: -1, d: 2, owner: 'p1', structure: 'city', hasCityWall: true });
    const knightVertex = createTestVertex({ id: 'v-knight', q: 2, r: -2, d: 4, owner: null, structure: null });
    const validEmptyVertex = createTestVertex({ id: 'v-valid', q: -2, r: 2, d: 0, owner: null, structure: null });
    const invalidEmptyVertex = createTestVertex({ id: 'v-invalid', q: -2, r: 0, d: 3, owner: null, structure: null });

    const roadEdge = createTestEdge({ id: 'e-road', q: 0, r: -2, d: 3, owner: 'p1', structure: 'road' });
    const validEmptyEdge = createTestEdge({ id: 'e-valid', q: -2, r: 2, d: 2, owner: null, structure: null });
    const invalidEmptyEdge = createTestEdge({ id: 'e-invalid', q: 2, r: 0, d: 5, owner: null, structure: null });

    const vertices = {
        [settlementVertex.id]: settlementVertex,
        [cityVertex.id]: cityVertex,
        [knightVertex.id]: knightVertex,
        [validEmptyVertex.id]: validEmptyVertex,
        [invalidEmptyVertex.id]: invalidEmptyVertex,
    };

    const edges = {
        [roadEdge.id]: roadEdge,
        [validEmptyEdge.id]: validEmptyEdge,
        [invalidEmptyEdge.id]: invalidEmptyEdge,
    };

    const knight: Knight = { id: 'knight-1', vertexId: knightVertex.id, playerId: 'p1', level: 'basic', active: true };

    const player = createTestPlayer({ id: 'p1', color: PLAYER_COLOR, knights: [knight] });

    const gameState = createTestGameState({
        id: 'game-smoke',
        players: [player],
        currentTurn: 'p1',
        board: { hexes, vertices, edges },
    });

    const knightsMap = new Map<string, Knight>([[knight.vertexId, knight]]);

    const validation = {
        validVertices: new Set([validEmptyVertex.id]),
        validEdges: new Set([validEmptyEdge.id]),
        validHexes: new Set<string>(),
    };

    const selectionState: BoardSelectionState = { buildMode: null };

    return {
        hexes,
        gameState,
        knightsMap,
        validation,
        selectionState,
        settlementVertex,
        cityVertex,
        knightVertex,
        validEmptyVertex,
        invalidEmptyVertex,
        roadEdge,
        validEmptyEdge,
        invalidEmptyEdge,
    };
}

type Fixture = ReturnType<typeof buildFixture>;

function renderBoard(fixture: Fixture) {
    return render(
        <BoardCanvas
            gameState={fixture.gameState}
            playerId="p1"
            hexSize={HEX_SIZE}
            selectionState={fixture.selectionState}
            validation={fixture.validation}
            vertices={Object.values(fixture.gameState.board.vertices)}
            renderEdges={Object.values(fixture.gameState.board.edges)}
            knightsMap={fixture.knightsMap}
            pendingPlacement={null}
            onVertexClick={() => { }}
            onEdgeClick={() => { }}
            onHexClick={() => { }}
            onConfirmPlacement={() => { }}
            onCancelPlacement={() => { }}
            onCancelBuild={() => { }}
        />
    );
}

function findVertexGroup(container: HTMLElement, vertex: { q: number; r: number; d: number }) {
    const pixel = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, HEX_SIZE);
    const transform = `translate(${pixel.x}, ${pixel.y})`;
    return Array.from(container.querySelectorAll('g')).find(g => g.getAttribute('transform') === transform) ?? null;
}

function findEdgeGroup(container: HTMLElement, edge: { q: number; r: number; d: number }) {
    const pixel = hexEdgeToPixel(createHex(edge.q, edge.r), edge.d, HEX_SIZE);
    const rotation = 60 * edge.d;
    const transform = `translate(${pixel.x}, ${pixel.y}) rotate(${rotation})`;
    return Array.from(container.querySelectorAll('g')).find(g => g.getAttribute('transform') === transform) ?? null;
}

describe('BoardCanvas smoke tests (flat theme)', () => {
    it('renders every hex tile on the board', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const svg = container.querySelector('#board-svg')!;
        // Tiles are counted by their root group's data-terrain marker, not by raw
        // polygon count — illustrated tiles are composed of many polygons.
        const tiles = svg.querySelectorAll('g[data-terrain]');
        expect(tiles.length).toBe(fixture.hexes.length);
        expect(tiles.length).toBe(19);
    });

    it('renders the correct number-token values', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const svg = container.querySelector('#board-svg')!;
        // Scope to tile groups: the barbarian route's strength chips also render
        // bare digits, and they are not number tokens.
        const texts = Array.from(svg.querySelectorAll('g[data-terrain] text'));
        const tokenTexts = texts.filter(t => /^\d+$/.test(t.textContent ?? ''));

        // 18 numbered hexes (19 tiles - 1 desert)
        expect(tokenTexts.length).toBe(18);

        const values = tokenTexts.map(t => t.textContent).sort();
        const expected = fixture.hexes
            .map(h => h.numberToken)
            .filter((n): n is number => n !== null)
            .map(String)
            .sort();
        expect(values).toEqual(expected);
    });

    it('renders pure inline SVG: no foreignObject, no dangling <use> references', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const svg = container.querySelector('#board-svg')!;

        // The tabletop theme draws everything inline; if a <use> ever appears,
        // it must resolve to a symbol that exists inside this svg.
        const symbolIds = new Set(Array.from(svg.querySelectorAll('symbol')).map(s => s.id));
        const useHrefs = Array.from(svg.querySelectorAll('use'))
            .map(u => u.getAttribute('href'))
            .filter((href): href is string => !!href && href.startsWith('#'));
        for (const href of useHrefs) {
            expect(symbolIds.has(href.slice(1))).toBe(true);
        }
        expect(svg.querySelectorAll('foreignObject').length).toBe(0);
    });

    it('renders one marker per generated port', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const svg = container.querySelector('#board-svg')!;
        const ratioTexts = Array.from(svg.querySelectorAll('text')).filter(
            t => t.textContent === '2:1' || t.textContent === '3:1'
        );
        expect(ratioTexts.length).toBe(generatePorts(HEX_SIZE).length);
        expect(ratioTexts.length).toBe(9);
    });

    it('renders a settlement at its vertex with the owner color', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const group = findVertexGroup(container, fixture.settlementVertex);
        expect(group).not.toBeNull();
        const piece = group!.querySelector('[data-piece="settlement"]');
        expect(piece).not.toBeNull();
        expect(piece!.querySelector(`path[fill="${PLAYER_COLOR_VAR}"]`)).not.toBeNull();
    });

    it('renders a city (with wall) at its vertex with the owner color', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const group = findVertexGroup(container, fixture.cityVertex);
        expect(group).not.toBeNull();
        const piece = group!.querySelector('[data-piece="city"]');
        expect(piece).not.toBeNull();
        expect(piece!.querySelector(`path[fill="${PLAYER_COLOR_VAR}"]`)).not.toBeNull();
        // fixture city has a wall — the rampart renders beneath it
        expect(group!.querySelector('[data-piece="city-wall"]')).not.toBeNull();
    });

    it('renders a road at its edge with the owner color', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const group = findEdgeGroup(container, fixture.roadEdge);
        expect(group).not.toBeNull();
        const rect = group!.querySelector(`rect[fill="${PLAYER_COLOR_VAR}"]`);
        expect(rect).not.toBeNull();
    });

    it('renders a knight at its vertex with a level tooltip', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);
        const group = findVertexGroup(container, fixture.knightVertex);
        expect(group).not.toBeNull();
        const title = group!.querySelector('title');
        expect(title?.textContent).toContain('Basic Knight');
    });

    it('attaches the valid-placement highlight to the correct vertex (and nowhere else)', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);

        const validGroup = findVertexGroup(container, fixture.validEmptyVertex);
        expect(validGroup).not.toBeNull();
        expect(validGroup!.querySelector('circle[fill="rgba(255, 255, 255, 0.5)"]')).not.toBeNull();

        // A vertex that is neither owned nor in the valid set renders nothing at all.
        const invalidGroup = findVertexGroup(container, fixture.invalidEmptyVertex);
        expect(invalidGroup).toBeNull();
    });

    it('renders an accessible player-colored target for legal knight placement', () => {
        const fixture = buildFixture();
        fixture.selectionState.buildMode = 'knight';
        const { container } = renderBoard(fixture);

        const validGroup = findVertexGroup(container, fixture.validEmptyVertex);
        const target = validGroup?.querySelector('[data-placement-target="knight"]');
        expect(target).not.toBeNull();
        expect(target).toHaveAttribute('aria-label', 'Legal knight placement');
        expect(target).toHaveAttribute('tabindex', '0');
        expect(target!.querySelector('[data-piece="knight-basic"]')).not.toBeNull();
        expect(target!.querySelector(`path[fill="${PLAYER_COLOR_VAR}"]`)).not.toBeNull();
    });

    it('attaches the valid-placement highlight to the correct edge (and nowhere else)', () => {
        const fixture = buildFixture();
        const { container } = renderBoard(fixture);

        const validGroup = findEdgeGroup(container, fixture.validEmptyEdge);
        expect(validGroup).not.toBeNull();
        expect(validGroup!.querySelector('rect[fill="rgba(255, 255, 255, 0.6)"]')).not.toBeNull();

        const invalidGroup = findEdgeGroup(container, fixture.invalidEmptyEdge);
        expect(invalidGroup).toBeNull();
    });

    it('renders the barbarian sea route with the ship in Cities & Knights mode', () => {
        const fixture = buildFixture();
        fixture.gameState.barbarianPosition = 3;
        const { container } = renderBoard(fixture);
        const route = container.querySelector('[data-testid="barbarian-route"]');
        expect(route).not.toBeNull();
        expect(route!.querySelector('[data-testid="barbarian-ship"]')).not.toBeNull();
        // Full text summary survives as the route tooltip
        expect(route!.querySelector('title')?.textContent).toContain('Position: 3 / 7');
    });

    it('does not render the barbarian route in base mode', () => {
        const fixture = buildFixture();
        fixture.gameState.gameMode = 'base';
        const { container } = renderBoard(fixture);
        expect(container.querySelector('[data-testid="barbarian-route"]')).toBeNull();
    });
});
