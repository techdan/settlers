import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { synchronizeTimerClock } from '@/lib/services/timer-clock';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { GameState } from '@/lib/types/game';

const SERVER_NOW = 1_000_000;
const CLIENT_NOW = SERVER_NOW + 20_000;

function createTimedState(): GameState {
  return {
    ...createTestGameState({
      players: [createTestPlayer({ id: 'p1' })],
      currentTurn: 'p1',
    }),
    timerConfig: {
      enabled: true,
      turnTimeLimit: 120,
      timeBank: 300,
      extensionIncrement: 60,
      maxExtensionsPerTurn: 2,
      maxExtraSecondsPerTurn: 180,
    },
    turnStartTime: SERVER_NOW,
    timerServerTime: SERVER_NOW,
  };
}

describe('useTimerState server clock synchronization', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the full limit when the device clock is 20 seconds ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(CLIENT_NOW);
    const state = synchronizeTimerClock(createTimedState());

    const { result } = renderHook(() => useTimerState(state));

    expect(state.timerClockOffsetMs).toBe(20_000);
    expect(result.current.timeElapsed).toBe(0);
    expect(result.current.timeRemaining).toBe(120);
  });

  it('continues counting down from server time after synchronization', () => {
    vi.useFakeTimers();
    vi.setSystemTime(CLIENT_NOW);
    const state = synchronizeTimerClock(createTimedState());
    vi.setSystemTime(CLIENT_NOW + 5_000);

    const { result } = renderHook(() => useTimerState(state));

    expect(result.current.timeElapsed).toBe(5);
    expect(result.current.timeRemaining).toBe(115);
  });
});
