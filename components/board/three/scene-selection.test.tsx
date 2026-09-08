import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTestGameState, createTestPlayer, createTestVertex } from '@/lib/test-utils';
import { boardPorts, barbarianRoutePoints, boardBounds } from '@/lib/presentation/board-geometry';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import type { BoardSelectionState } from '@/lib/types/board-selection-state';
import type { Knight } from '@/lib/types/player';
import { BoardSceneHud } from './BoardSceneHud';
import { edgeIsSelected, hexSelection, vertexIsSelected } from './scene-selection';

function fixture(selectionState: BoardSelectionState = { buildMode: null }): BoardRendererProps {
  const vertex = createTestVertex({ id: 'city', owner: 'p1', structure: 'city' });
  const gameState = createTestGameState({ players: [createTestPlayer({ id: 'p1' })], board: { hexes: [], vertices: { city: vertex }, edges: {} } });
  return {
    gameState, authoritativeState: gameState, playerId: 'p1', hexSize: 90, selectionState,
    vertices: [vertex], renderEdges: [], knightsMap: new Map(), pendingPlacement: null,
    displayedRobberHexId: null, validation: { validVertices: new Set(), validEdges: new Set(), validHexes: new Set() },
    onVertexClick: vi.fn(), onEdgeClick: vi.fn(), onHexClick: vi.fn(), onConfirmPlacement: vi.fn(), onCancelPlacement: vi.fn(), onCancelBuild: vi.fn(),
  };
}

describe('3D selection parity', () => {
  const knight: Knight = { id: 'k1', vertexId: 'city', playerId: 'p1', level: 'mighty', active: true };
  it.each<BoardSelectionState>([
    { buildMode: null, citySelection: { type: 'medicine', selectedCityId: 'city' } },
    { buildMode: null, citySelection: { type: 'engineer', selectedCityId: 'city' } },
    { buildMode: null, citySelection: { type: 'metropolis', selectedCityId: 'city' } },
    { buildMode: null, vertexCardSelection: { type: 'intrigue', selectedKnightId: 'k1' } },
    { buildMode: null, vertexCardSelection: { type: 'treason_remove', selectedKnightId: 'k1' } },
    { buildMode: null, vertexCardSelection: { type: 'treason_place', placementVertexId: 'city' } },
    { buildMode: null, smithSelection: { selectedKnightIds: ['k1'] } },
    { buildMode: null, movingKnightId: 'k1' },
  ])('retains the selected C&K intersection for %j', selection => {
    expect(vertexIsSelected(fixture(selection), 'city', knight)).toBe(true);
    expect(vertexIsSelected(fixture(selection), 'other')).toBe(false);
  });

  it('distinguishes both Inventor selections and highlights the relocated Diplomat road', () => {
    const board = fixture({ buildMode: null, hexCardSelection: { type: 'inventor', inventorSelection: { firstHexId: 'first', secondHexId: 'second' } }, edgeCardSelection: { type: 'diplomat', removedEdgeId: 'old', relocatedEdgeId: 'new' } });
    expect(hexSelection(board, 'first')).toBe('primary');
    expect(hexSelection(board, 'second')).toBe('secondary');
    expect(hexSelection(board, 'other')).toBeNull();
    expect(edgeIsSelected(board, 'old')).toBe(true);
    expect(edgeIsSelected(board, 'new')).toBe(true);
  });

  it('exposes existing owned pieces for keyboard action even outside placement mode', () => {
    const board = fixture();
    render(<BoardSceneHud board={board} cameraApi={{ current: null }} topDown={false} onTopDown={vi.fn()} lowQuality={false} onQuality={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Board targets (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'city · city' }));
    expect(board.onVertexClick).toHaveBeenCalledExactlyOnceWith('city');
  });

  it('uses the existing confirmation callbacks and blocks repeated submits while busy', () => {
    const board = fixture();
    board.pendingPlacement = { type: 'city_wall', id: 'city', phase: 'main' };
    const { rerender } = render(<BoardSceneHud board={board} cameraApi={{ current: null }} topDown={false} onTopDown={vi.fn()} lowQuality={false} onQuality={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm city wall' }));
    expect(board.onConfirmPlacement).toHaveBeenCalledOnce();
    rerender(<BoardSceneHud board={{ ...board, placementBusy: true }} cameraApi={{ current: null }} topDown={false} onTopDown={vi.fn()} lowQuality={false} onQuality={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Placing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

describe('3D harbor geometry', () => {
  it('normalizes fixed pixel offsets and frames every harbor and route step', () => {
    const ports = boardPorts(90);
    expect(ports).toHaveLength(9);
    for (const port of ports) {
      const midpoint = { x: (port.vertices[0].x + port.vertices[1].x) / 2, z: (port.vertices[0].z + port.vertices[1].z) / 2 };
      expect(Math.hypot(port.position.x - midpoint.x, port.position.z - midpoint.z)).toBeCloseTo(2 / 3);
    }
    const route = barbarianRoutePoints(ports);
    const bounds = boardBounds([], ports, route);
    for (const point of [...ports.map(port => port.position), ...route]) {
      expect(point.x).toBeGreaterThan(bounds.minX);
      expect(point.x).toBeLessThan(bounds.maxX);
      expect(point.z).toBeGreaterThan(bounds.minZ);
      expect(point.z).toBeLessThan(bounds.maxZ);
    }
  });
});
