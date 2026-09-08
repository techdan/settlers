import { describe, expect, it, vi } from 'vitest';
import { isPresentationEventFresh } from './event-freshness';

describe('confirmed presentation event freshness', () => {
  it('accepts the eight-second boundary and suppresses older snapshots', () => {
    expect(isPresentationEventFresh(92_000, 100_000)).toBe(true);
    expect(isPresentationEventFresh(91_999, 100_000)).toBe(false);
  });

  it('uses the server sample despite a client clock that runs ahead or behind', () => {
    expect(isPresentationEventFresh(99_000, 100_000, 900_000)).toBe(true);
    expect(isPresentationEventFresh(80_000, 100_000, 81_000)).toBe(false);
  });

  it('falls back to Date.now when a valid server sample is unavailable', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    try {
      expect(isPresentationEventFresh(99_000)).toBe(true);
      expect(isPresentationEventFresh(90_000)).toBe(false);
      expect(isPresentationEventFresh(90_000, Number.NaN)).toBe(false);
      expect(isPresentationEventFresh(90_000, 0)).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it('rejects missing or invalid event times instead of guessing from faces or logs', () => {
    for (const timestamp of [undefined, null, 0, -1, Number.NaN, Infinity]) {
      expect(isPresentationEventFresh(timestamp, 100_000)).toBe(false);
    }
  });

  it('accepts an event captured just after the accompanying server clock sample', () => {
    expect(isPresentationEventFresh(100_050, 100_000)).toBe(true);
  });
});
