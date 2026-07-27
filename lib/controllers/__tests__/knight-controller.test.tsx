import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createKnightController,
  type KnightControllerDeps,
} from '@/lib/controllers/knight-controller';
import type { PlayProgressCard } from '@/lib/controllers/progress-card/types';
import { useSelectionManager } from '@/lib/hooks/useSelectionManager';
import {
  createTestGameState,
  createTestPlayer,
} from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types';

vi.mock('@/app/actions', () => ({
  activateKnight: vi.fn(),
  upgradeKnight: vi.fn(),
  relocateKnight: vi.fn(),
  chaseAwayRobber: vi.fn(),
}));

function createControllerHarness(
  gameState: GameState,
  overrides: Partial<KnightControllerDeps> = {},
) {
  const selection = renderHook(() => useSelectionManager());
  const handlePlayProgressCard = vi.fn<PlayProgressCard>();

  const controller = () =>
    createKnightController({
      roomId: 'room-1',
      playerId: 'p1',
      gameState,
      selectionManager: selection.result.current,
      getOptimisticState: (state) => state,
      handlePlayProgressCard,
      ...overrides,
    });

  return {
    selection,
    controller,
    handlePlayProgressCard,
  };
}

function createSmithGameState(): GameState {
  return createTestGameState({
    players: [
      createTestPlayer({
        id: 'p1',
        knights: [
          {
            id: 'knight-1',
            vertexId: 'vertex-1',
            playerId: 'p1',
            level: 'basic',
            active: false,
          },
          {
            id: 'knight-2',
            vertexId: 'vertex-2',
            playerId: 'p1',
            level: 'strong',
            active: true,
          },
        ],
        improvements: { science: 0, trade: 0, politics: 3 },
      }),
    ],
  });
}

describe('knight controller Smith flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes the selected knight IDs as Smith play options', async () => {
    const harness = createControllerHarness(createSmithGameState());

    act(() => {
      harness.selection.result.current.setSelectingKnightsForSmith(true);
      harness.selection.result.current.setSelectedSmithKnightIds([
        'knight-1',
        'knight-2',
      ]);
    });

    await act(async () => {
      await harness.controller().handleConfirmSmithPromotions();
    });

    expect(harness.handlePlayProgressCard).toHaveBeenCalledWith('smith', {
      knightIds: ['knight-1', 'knight-2'],
    });
  });

  it('resets the Smith selection after a successful play', async () => {
    const harness = createControllerHarness(createSmithGameState());

    act(() => {
      harness.selection.result.current.setSelectingKnightsForSmith(true);
      harness.selection.result.current.setSelectedSmithKnightIds(['knight-1']);
      harness.selection.result.current.setSmithError('Previous failure');
    });

    await act(async () => {
      await harness.controller().handleConfirmSmithPromotions();
    });

    expect(harness.selection.result.current.selectingKnightsForSmith).toBe(
      false,
    );
    expect(harness.selection.result.current.selectedSmithKnightIds).toEqual([]);
    expect(harness.selection.result.current.smithError).toBeNull();
  });

  it('surfaces rejected plays without clearing the Smith selection', async () => {
    const harness = createControllerHarness(createSmithGameState());
    harness.handlePlayProgressCard.mockRejectedValue(
      new Error('Smith play was rejected'),
    );

    act(() => {
      harness.selection.result.current.setSelectingKnightsForSmith(true);
      harness.selection.result.current.setSelectedSmithKnightIds(['knight-1']);
    });

    await act(async () => {
      await harness.controller().handleConfirmSmithPromotions();
    });

    expect(harness.selection.result.current.smithError).toBe(
      'Smith play was rejected',
    );
    expect(harness.selection.result.current.selectingKnightsForSmith).toBe(
      true,
    );
    expect(harness.selection.result.current.selectedSmithKnightIds).toEqual([
      'knight-1',
    ]);
  });
});
