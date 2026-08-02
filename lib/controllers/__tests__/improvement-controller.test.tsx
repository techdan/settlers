import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { placeMetropolis, upgradeImprovement } from '@/app/actions';
import {
  createImprovementController,
  type ImprovementControllerDeps,
} from '@/lib/controllers/improvement-controller';
import { useSelectionManager } from '@/lib/hooks/useSelectionManager';
import {
  createTestGameState,
  createTestPlayer,
} from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types';
import type { PlayProgressCard } from '@/lib/controllers/progress-card/types';

vi.mock('@/app/actions', () => ({
  buildCityWall: vi.fn(),
  buildCity: vi.fn(),
  placeMetropolis: vi.fn(),
  upgradeImprovement: vi.fn(),
}));

const placeMetropolisMock = vi.mocked(placeMetropolis);
const upgradeImprovementMock = vi.mocked(upgradeImprovement);

function createPrompt() {
  return {
    begin: vi.fn(),
    setStatus: vi.fn(),
    clear: vi.fn(),
  };
}

function createControllerHarness(
  gameState: GameState,
  overrides: Partial<ImprovementControllerDeps> = {},
) {
  const selection = renderHook(() => useSelectionManager());
  const metropolisPrompt = createPrompt();
  const handlePlayProgressCard = vi.fn<PlayProgressCard>();

  const controller = () =>
    createImprovementController({
      roomId: 'room-1',
      playerId: 'p1',
      gameState,
      selectionManager: selection.result.current,
      metropolisPrompt,
      handlePlayProgressCard,
      ...overrides,
    });

  return {
    selection,
    controller,
    metropolisPrompt,
    handlePlayProgressCard,
  };
}

describe('improvement controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes the selected Crane improvement and closes the dialog', async () => {
    const gameState = createTestGameState({
      players: [createTestPlayer({ id: 'p1' })],
    });
    const harness = createControllerHarness(gameState);

    act(() => {
      harness.selection.result.current.setIsCraneDialogOpen(true);
    });

    await act(async () => {
      await harness.controller().handleCraneUpgrade('trade');
    });

    expect(harness.handlePlayProgressCard).toHaveBeenCalledWith('crane', {
      improvement: 'trade',
    });
    expect(harness.selection.result.current.isCraneDialogOpen).toBe(false);
  });

  it('reports metropolis failures and always releases the submitting state', async () => {
    const gameState = createTestGameState({
      players: [createTestPlayer({ id: 'p1' })],
    });
    const harness = createControllerHarness(gameState);
    const error = new Error('Metropolis placement was rejected');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    placeMetropolisMock.mockRejectedValue(error);

    act(() => {
      harness.selection.result.current.setSelectedMetropolisCityId('city-1');
      harness.selection.result.current.setSelectingCityForMetropolis('science');
    });

    await act(async () => {
      await harness.controller().handleConfirmMetropolisBuild();
    });

    expect(placeMetropolisMock).toHaveBeenCalledWith(
      'room-1',
      'p1',
      'city-1',
      'science',
    );
    expect(harness.metropolisPrompt.setStatus).toHaveBeenNthCalledWith(
      1,
      'Upgrading to metropolis...',
    );
    expect(harness.metropolisPrompt.setStatus).toHaveBeenNthCalledWith(
      2,
      'Metropolis placement was rejected',
    );
    expect(harness.metropolisPrompt.clear).not.toHaveBeenCalled();
    expect(harness.selection.result.current.selectingCityForMetropolis).toBe(
      'science',
    );
    expect(harness.selection.result.current.selectedMetropolisCityId).toBe(
      'city-1',
    );
    expect(harness.selection.result.current.isMetropolisSubmitting).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to upgrade to metropolis',
      error,
    );
  });

  it('keeps the metropolis target selectable and submits the chosen city', async () => {
    const gameState = createTestGameState({
      currentTurn: 'p1',
      phase: 'main_phase',
      players: [
        createTestPlayer({
          id: 'p1',
          improvements: { science: 3, trade: 0, politics: 0 },
          commodities: { paper: 3, cloth: 0, coin: 0 },
        }),
      ],
      board: {
        ...createTestGameState().board,
        vertices: {
          'city-a': {
            id: 'city-a', q: 0, r: 0, d: 0,
            owner: 'p1', structure: 'city', hasCityWall: false,
          },
          'walled-city': {
            id: 'walled-city', q: 0, r: 0, d: 1,
            owner: 'p1', structure: 'city', hasCityWall: true,
          },
        },
      },
    });
    const updatedGameState = structuredClone(gameState);
    updatedGameState.players[0].improvements!.science = 4;
    const harness = createControllerHarness(gameState);
    upgradeImprovementMock.mockResolvedValue(updatedGameState);
    placeMetropolisMock.mockResolvedValue(updatedGameState);

    await act(async () => {
      await harness.controller().handleUpgradeImprovement('science');
    });

    expect(harness.selection.result.current.selectingCityForMetropolis).toBe('science');
    expect(harness.metropolisPrompt.begin).toHaveBeenCalledWith(
      'Select a city to upgrade to Science Metropolis',
    );

    act(() => {
      harness.controller().handleMetropolisCitySelected('walled-city');
    });

    expect(harness.selection.result.current.selectedMetropolisCityId).toBe('walled-city');

    await act(async () => {
      await harness.controller().handleConfirmMetropolisBuild();
    });

    expect(placeMetropolisMock).toHaveBeenCalledWith(
      'room-1', 'p1', 'walled-city', 'science',
    );
  });
});
