'use client';

import { useEffect, useRef } from 'react';

export interface ViewportRect { left: number; top: number; right: number; bottom: number; width: number; height: number }
export interface BoardViewportInsets { top: number; right: number; bottom: number; left: number }
export interface BoardHudRects { rail?: ViewportRect; tray?: ViewportRect; headers?: ViewportRect[]; leftPanels?: ViewportRect[] }

/** Rectangles already include CSS transforms; offsetWidth/Height would over-reserve scaled HUDs. */
export function calculateBoardViewportInsets(viewport: ViewportRect, hud: BoardHudRects, gap = 8): BoardViewportInsets {
  const visible = (rect?: ViewportRect): rect is ViewportRect => !!rect && rect.width > 0 && rect.height > 0
    && rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;
  const headers = (hud.headers ?? []).filter(visible);
  const leftPanels = (hud.leftPanels ?? []).filter(visible);
  return {
    top: Math.min(viewport.height, Math.max(0, ...headers.map(rect => Math.ceil(rect.bottom - viewport.top + gap)))),
    right: visible(hud.rail) ? Math.min(viewport.width, Math.ceil(viewport.right - hud.rail.left + gap)) : 0,
    bottom: visible(hud.tray) ? Math.min(viewport.height, Math.ceil(viewport.bottom - hud.tray.top + gap)) : 0,
    left: Math.min(viewport.width, Math.max(0, ...leftPanels.map(rect => Math.ceil(rect.right - viewport.left + gap)))),
  };
}

const INSET_PROPERTIES = ['--board-inset-top', '--board-inset-right', '--board-inset-bottom', '--board-inset-left'] as const;

/** Measures the live game HUD without changing its layout or the board interaction owner. */
export function useBoardViewportInsets(enabled: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewportRef.current;
    if (!enabled || !element) return;
    const viewport: HTMLDivElement = element;
    let frame: number | null = null;
    let observedHud: HTMLElement | null = null;
    let observedElements = new Set<Element>();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule());
    const mutationObserver = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => schedule());

    const findHud = () => {
      for (let ancestor = viewport.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const tray = ancestor.querySelector<HTMLElement>('[data-hud="tray"]');
        if (tray) return tray.parentElement;
      }
      return null;
    };

    function measure() {
      frame = null;
      const hud = findHud();
      const rail = hud?.querySelector<HTMLElement>('[data-hud="rail"]');
      const tray = hud?.querySelector<HTMLElement>('[data-hud="tray"]');
      const leftPanels: HTMLElement[] = [];
      const headers: ViewportRect[] = [];
      const targets: Element[] = [viewport];
      if (rail) targets.push(rail);
      if (tray) targets.push(tray);
      if (hud) {
        targets.push(hud);
        for (const child of Array.from(hud.children)) {
          if (!(child instanceof HTMLElement) || child === rail || child === tray) continue;
          // Existing desktop deck/debug clusters explicitly anchor their transform here.
          const origin = child.style.transformOrigin;
          if (origin.includes('left') && origin.includes('top')) {
            leftPanels.push(child);
            targets.push(child);
          }
          // Reserve the persistent tablet bar. Its optional drawers remain overlays.
          if (child.classList.contains('xl:hidden')) {
            const panel = child.firstElementChild;
            const row = panel?.firstElementChild;
            if (panel instanceof HTMLElement && row instanceof HTMLElement) {
              const rect = row.getBoundingClientRect();
              const padding = Number.parseFloat(getComputedStyle(panel).paddingBottom) || 0;
              headers.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom + padding, width: rect.width, height: rect.height + padding });
              targets.push(child, panel, row);
            }
          }
        }
      }

      const nextElements = new Set(targets);
      if (nextElements.size !== observedElements.size || [...nextElements].some(element => !observedElements.has(element))) {
        resizeObserver?.disconnect();
        targets.forEach(element => resizeObserver?.observe(element));
        observedElements = nextElements;
      }
      if (hud !== observedHud) {
        mutationObserver?.disconnect();
        // Scale transforms do not trigger ResizeObserver. Watch only HUD layout owners.
        if (hud) {
          mutationObserver?.observe(hud, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
          for (const child of Array.from(hud.children)) mutationObserver?.observe(child, { attributes: true, attributeFilter: ['style', 'class'] });
        }
        observedHud = hud;
      }

      const insets = calculateBoardViewportInsets(viewport.getBoundingClientRect(), {
        rail: rail?.getBoundingClientRect(), tray: tray?.getBoundingClientRect(),
        headers, leftPanels: leftPanels.map(panel => panel.getBoundingClientRect()),
      });
      (['top', 'right', 'bottom', 'left'] as const).forEach(side => {
        const property = `--board-inset-${side}`;
        const value = `${insets[side]}px`;
        if (viewport.style.getPropertyValue(property) !== value) viewport.style.setProperty(property, value);
      });
      viewport.dataset.boardViewportMeasured = 'true';
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(measure);
    }
    schedule();
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      INSET_PROPERTIES.forEach(property => viewport.style.removeProperty(property));
      delete viewport.dataset.boardViewportMeasured;
    };
  }, [enabled]);
  return viewportRef;
}
