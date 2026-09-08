'use client';

import { useSyncExternalStore } from 'react';

export type BoardPresentation = 'classic' | 'three';
const STORAGE_KEY = 'settlers.board-presentation.v1';
const CHANGE_EVENT = 'settlers:presentation';
let memoryPreference: BoardPresentation | undefined;

function readPreference(): BoardPresentation {
  if (memoryPreference) return memoryPreference;
  try { return localStorage.getItem(STORAGE_KEY) === 'three' ? 'three' : 'classic'; }
  catch { return 'classic'; }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      memoryPreference = undefined;
      listener();
    }
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setBoardPresentation(mode: BoardPresentation) {
  memoryPreference = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* Private browsing still supports switching. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Browser-local preference, never synchronized through game state. */
export function useBoardPresentation() {
  const mode = useSyncExternalStore(subscribe, readPreference, () => 'classic' as const);
  return { mode, setMode: setBoardPresentation };
}
