import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStandardBoard } from '@/core/engine/board/board-generator';
import { useBoardActions } from '@/lib/hooks/useBoardActions';
import { createTestBoard, createTestGameState, createTestPlayer } from '@/lib/test-utils';
import type { BoardCallbacks, PendingBoardPlacement } from '@/lib/types/board-selection-state';

const actionMocks = vi.hoisted(() => ({
  moveRobber: vi.fn(),
  moveKnight: vi.fn(),
  placeMetropolis: vi.fn(),
}));

const validatorMocks = vi.hoisted(() => ({
  isValidKnightMovement: vi.fn(),
  isValidMetropolisPlacement: vi.fn(),
}));

vi.mock('@/app/actions', () => ({
  placeSettlement: vi.fn(),
  placeRoad: vi.fn(),
  moveRobber: actionMocks.moveRobber,
  buildRoad: vi.fn(),
  buildSettlement: vi.fn(),
  buildCity: vi.fn(),
  placeBonusRoad: vi.fn(),
  buildKnight: vi.fn(),
  buildCityWall: vi.fn(),
  relocateKnight: vi.fn(),
  moveKnight: actionMocks.moveKnight,
  placeMetropolis: actionMocks.placeMetropolis,
}));

vi.mock('@/core/validation/knight-validator', () => ({
  isValidKnightMovement: validatorMocks.isValidKnightMovement,
  isValidKnightPlacement: vi.fn(),
}));

vi.mock('@/core/validation/metropolis-validator', () => ({
  isValidMetropolisPlacement: validatorMocks.isValidMetropolisPlacement,
}));

describe('useBoardActions robber confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('previews a robber move, cancels without leaving placement, and commits only after confirmation', async () => {
    const hexes = generateStandardBoard();
    const originalHexId = hexes[0].id;
    const targetHexId = hexes[1].id;
    const player = createTestPlayer({ id: 'p1' });
    const gameState = createTestGameState({
      roomId: 'room-1',
      players: [player],
      currentTurn: player.id,
      phase: 'robber_placement',
      robberHexId: originalHexId,
      board: {
        hexes,
        vertices: {},
        edges: {},
      },
    });
    const updatedGameState = { ...gameState, robberHexId: targetHexId, phase: 'main_phase' as const };
    actionMocks.moveRobber.mockResolvedValue(updatedGameState);

    const onCancelBuild = vi.fn();
    const onRobberMoveStarted = vi.fn();
    const onGameStateUpdated = vi.fn();
    const callbacks: BoardCallbacks = {
      onCancelBuild,
      onRobberMoveStarted,
      onGameStateUpdated,
    };

    const { result } = renderHook(() => {
      const [pendingPlacement, setPendingPlacement] = useState<PendingBoardPlacement | null>(null);
      const actions = useBoardActions(
        gameState,
        player.id,
        { buildMode: null },
        callbacks,
        {
          validVertices: new Set(),
          validEdges: new Set(),
          validHexes: pendingPlacement ? new Set() : new Set([targetHexId]),
        },
        new Map(),
        pendingPlacement,
        setPendingPlacement,
      );

      return { pendingPlacement, ...actions };
    });

    act(() => result.current.handleHexClick(targetHexId));

    expect(result.current.pendingPlacement).toEqual({
      type: 'robber',
      id: targetHexId,
      phase: 'robber',
    });
    expect(actionMocks.moveRobber).not.toHaveBeenCalled();
    expect(onRobberMoveStarted).not.toHaveBeenCalled();

    act(() => result.current.handleCancelPlacement());

    expect(result.current.pendingPlacement).toBeNull();
    expect(onCancelBuild).not.toHaveBeenCalled();

    act(() => result.current.handleHexClick(targetHexId));
    act(() => result.current.handleConfirmPlacement());

    expect(onRobberMoveStarted).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(actionMocks.moveRobber).toHaveBeenCalledWith('room-1', player.id, targetHexId, undefined);
      expect(onGameStateUpdated).toHaveBeenCalledWith(updatedGameState);
      expect(result.current.pendingPlacement).toBeNull();
    });
  });

  it('validates and moves a selected knight through the imported validator and action', async () => {
    const player = createTestPlayer({ id: 'p1' });
    const gameState = createTestGameState({
      roomId: 'room-1',
      players: [player],
      currentTurn: player.id,
      phase: 'main_phase',
      board: createTestBoard({ vertices: [{ id: 'target' }] }),
    });
    const onCancelBuild = vi.fn();
    validatorMocks.isValidKnightMovement.mockReturnValue(true);
    actionMocks.moveKnight.mockResolvedValue(gameState);

    const { result } = renderHook(() =>
      useBoardActions(
        gameState,
        player.id,
        { buildMode: null, movingKnightId: 'knight-1' },
        { onCancelBuild },
        { validVertices: new Set(), validEdges: new Set(), validHexes: new Set() },
        new Map(),
        null,
        vi.fn(),
      ),
    );

    act(() => result.current.handleVertexClick('target'));

    expect(validatorMocks.isValidKnightMovement).toHaveBeenCalledWith(
      gameState,
      'knight-1',
      'target',
      player.id,
    );
    await waitFor(() => {
      expect(actionMocks.moveKnight).toHaveBeenCalledWith('room-1', player.id, 'knight-1', 'target');
      expect(onCancelBuild).toHaveBeenCalledOnce();
    });
  });

  it('validates and places a selected metropolis through the imported validator and action', async () => {
    const player = createTestPlayer({ id: 'p1' });
    const gameState = createTestGameState({
      roomId: 'room-1',
      players: [player],
      currentTurn: player.id,
      phase: 'main_phase',
      board: createTestBoard({ vertices: [{ id: 'target' }] }),
    });
    const onCancelBuild = vi.fn();
    validatorMocks.isValidMetropolisPlacement.mockReturnValue(true);
    actionMocks.placeMetropolis.mockResolvedValue(gameState);

    const { result } = renderHook(() =>
      useBoardActions(
        gameState,
        player.id,
        { buildMode: null, buildingMetropolisType: 'science' },
        { onCancelBuild },
        { validVertices: new Set(), validEdges: new Set(), validHexes: new Set() },
        new Map(),
        null,
        vi.fn(),
      ),
    );

    act(() => result.current.handleVertexClick('target'));

    expect(validatorMocks.isValidMetropolisPlacement).toHaveBeenCalledWith(
      gameState,
      'target',
      player.id,
      'science',
    );
    await waitFor(() => {
      expect(actionMocks.placeMetropolis).toHaveBeenCalledWith('room-1', player.id, 'target', 'science');
      expect(onCancelBuild).toHaveBeenCalledOnce();
    });
  });
});
