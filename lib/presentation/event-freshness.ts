/** Cosmetic playback window; snapshots always remain authoritative regardless of age. */
export const PRESENTATION_EVENT_MAX_AGE_MS = 8_000;

export function isPresentationEventFresh(
  timestamp: number | null | undefined,
  serverTime?: number,
  clientNow = Date.now(),
): boolean {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return false;
  const reference = typeof serverTime === 'number' && Number.isFinite(serverTime) && serverTime > 0
    ? serverTime : clientNow;
  // A server sample can precede an event captured later in the same operation.
  return Number.isFinite(reference) && reference - timestamp <= PRESENTATION_EVENT_MAX_AGE_MS;
}
