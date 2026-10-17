'use client';

import { useSyncExternalStore } from 'react';

export type BoardPresentation = 'classic' | 'three';
const CHANGE_EVENT = 'settlers:presentation';
let memoryPreference: BoardPresentation = 'three';

function readPreference(): BoardPresentation {
  return memoryPreference;
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function setBoardPresentation(mode: BoardPresentation) {
  memoryPreference = mode;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * 3D is primary. Ignore retired persisted preferences, including saved Classic.
 * Classic is retained as a session-only graphics failure fallback; reload retries 3D.
 * Never synchronized through game state. See graphics-overhaul-plan.md §4.15.
 */
export function useBoardPresentation() {
  const mode = useSyncExternalStore(subscribe, readPreference, () => 'three' as const);
  return { mode, setMode: setBoardPresentation };
}
