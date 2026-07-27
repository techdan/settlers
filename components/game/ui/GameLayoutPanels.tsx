'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '@/lib/types';
import { DebugPanel } from './DebugPanel';
import { SidebarTabs } from './SidebarTabs';
import { CompactGameStatus } from './CompactGameStatus';
import { TurnTimerExpiredNotification } from './TurnTimerExpiredNotification';
import { ProgressDecksPanel } from '../overlays/ProgressDecksPanel';

interface GameLayoutPanelsProps {
  gameState: GameState;
  playerId: string;
  isDebugMode: boolean;
  onOpenPlayerCityManagement: () => void;
  tray: React.ReactNode;
}

/** Viewport height at/above which the desktop HUD renders at full size. */
const HUD_FULL_HEIGHT = 920;
/** Viewport height at/below which the HUD is pinned to its smallest density. */
const HUD_MIN_HEIGHT = 620;
/** Floor for the density dial — below this the HUD stops being readable. */
const HUD_MIN_SCALE = 0.72;

export const GameLayoutPanels: React.FC<GameLayoutPanelsProps> = ({
  gameState,
  playerId,
  isDebugMode,
  onOpenPlayerCityManagement,
  tray,
}) => {
  const [tabletPanel, setTabletPanel] = useState<'status' | 'activity' | 'decks' | 'debug' | null>(null);

  // The bottom tray and the right rail are both absolutely positioned, so
  // neither reserves space for the other — on short viewports the rail used to
  // run underneath the tray and lose the log to it (tray wins on z-index).
  // Measure the tray's *rendered* height (getBoundingClientRect reflects the
  // --hud-scale transform below; offsetHeight would not) and publish it as
  // --tray-h so the rail can bound itself against it.
  const trayRef = useRef<HTMLDivElement>(null);
  const [trayHeight, setTrayHeight] = useState(0);

  // --hud-scale is the HUD's density dial. Every desktop cluster is built from
  // hardcoded pixel sizes (46px card faces, 12-30px glyphs, fixed type), so a
  // short viewport cannot shrink them on its own; scaling each cluster as a
  // whole keeps type, icons, padding and borders in proportion. Ramps linearly
  // from full size at >=920px of viewport height down to 0.72 at <=620px — a
  // 1366x768 laptop leaves roughly 660px and lands near 0.76. Only desktop
  // (xl+) is scaled; below that the tablet drawer HUD already handles density.
  const [hud, setHud] = useState({ scale: 1, isDesktop: true });

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 1280;
      const ramp = HUD_MIN_SCALE + ((window.innerHeight - HUD_MIN_HEIGHT) * (1 - HUD_MIN_SCALE)) / (HUD_FULL_HEIGHT - HUD_MIN_HEIGHT);
      const scale = isDesktop ? Math.min(1, Math.max(HUD_MIN_SCALE, Number(ramp.toFixed(3)))) : 1;
      setHud(current => (current.scale === scale && current.isDesktop === isDesktop ? current : { scale, isDesktop }));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const measure = () => setTrayHeight(tray.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(tray);
    return () => observer.disconnect();
    // Re-measure on scale changes too: a transform does not resize the layout
    // box, so ResizeObserver alone would never see the tray get shorter.
  }, [hud.scale]);

  const activePlayerName = gameState.players.find(player => player.id === gameState.currentTurn)?.name ?? 'Waiting';
  const currentPlayer = gameState.players.find(player => player.id === playerId);
  const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';
  const phaseLabel = gameState.phase.replaceAll('_', ' ');

  const toggleTabletPanel = (panel: NonNullable<typeof tabletPanel>) => {
    setTabletPanel(current => current === panel ? null : panel);
  };

  const tabletButtonClass = (panel: NonNullable<typeof tabletPanel>) =>
    `min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${
      tabletPanel === panel
        ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]'
        : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-text)] hover:brightness-110'
    }`;

  return (
    <div
      className="absolute inset-0 pointer-events-none p-4 max-xl:p-0"
      style={{ '--hud-scale': hud.scale, '--tray-h': `${trayHeight}px` } as React.CSSProperties}
    >
      {/* Timer expired notification at top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-auto px-4">
        <TurnTimerExpiredNotification gameState={gameState} currentPlayerId={playerId} />
      </div>

      {/* Right rail: game status with the collapsible log/chat/stats directly
          beneath it. Height is laid out at 1/scale and then scaled back down,
          so the rendered rail ends exactly where the tray begins and can never
          slide underneath it. The activity panel yields space before the
          player panel; only genuinely short viewports let the player panel
          shrink and scroll internally. */}
      <div
        data-hud="rail"
        className="absolute top-4 right-4 hidden w-80 min-h-0 flex-col gap-3 overflow-x-visible pointer-events-auto xl:flex"
        style={{
          height: 'calc((100% - 1.75rem - var(--tray-h, 0px)) / var(--hud-scale, 1))',
          transform: 'scale(var(--hud-scale, 1))',
          transformOrigin: 'top right',
        }}
      >
        {/* Keep every player visible without an internal scroller in normal
            desktop layouts. Below the HUD's minimum-density height there is no
            longer enough reliable vertical room, so this slot may shrink (with
            a floor) and CompactGameStatus becomes the fallback scroller. */}
        <div className="flex min-h-[9rem] shrink-0 overflow-visible [@media(max-height:620px)]:shrink [@media(max-height:620px)]:overflow-hidden">
          <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={onOpenPlayerCityManagement} />
        </div>
        <div className="flex min-h-0 shrink flex-col">
          <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
        </div>
      </div>

      {/* Debug panel (dev-only) sits in the top-left corner, immediately right of
          the board zoom controls (16px gutter + 76px of buttons = 6.5rem).
          Collapsed it is a 36px chip matching the zoom buttons' height, and its
          right edge (104px + 102px = 206px) is flush with the progress decks
          panel below (left-4 + 190px). Expanded it grows over those decks, hence
          the higher z-index. The open state is read off the toggle's own
          aria-expanded rather than lifted into this layout. */}
      {isDebugMode && currentPlayer && (
        <div
          className="absolute top-4 left-[6.5rem] z-30 hidden h-9 w-[6.375rem] pointer-events-auto has-[[aria-expanded=true]]:h-auto has-[[aria-expanded=true]]:w-[22rem] xl:block"
          style={{ transform: 'scale(var(--hud-scale, 1))', transformOrigin: 'top left' }}
        >
          <DebugPanel player={currentPlayer} roomId={gameState.roomId} />
        </div>
      )}

      {/* Barbarian status lives on the board itself now (BarbarianRoute in BoardCanvas) */}
      {isCitiesAndKnights && (
        <div
          className="absolute left-4 z-20 hidden flex-col gap-3 pointer-events-auto xl:flex"
          style={{ top: '4.25rem', transform: 'scale(var(--hud-scale, 1))', transformOrigin: 'top left' }}
        >
          <ProgressDecksPanel gameState={gameState} />
        </div>
      )}

      {/* Tablet HUD: iPad portrait/landscape keeps the board clear and exposes
          desktop side panels through touch-sized, mutually exclusive drawers. */}
      <div className="absolute inset-x-0 top-0 z-50 px-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-auto xl:hidden">
        <div className="mx-auto max-w-4xl rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain">
            <button
              type="button"
              className={`${tabletButtonClass('status')} min-w-max text-left`}
              aria-label={`${phaseLabel} ${activePlayerName}`}
              aria-expanded={tabletPanel === 'status'}
              onClick={() => toggleTabletPanel('status')}
            >
              <span className="block text-[10px] font-medium uppercase tracking-wider opacity-70">{phaseLabel}</span>
              <span className="block">{activePlayerName}</span>
            </button>
            <button type="button" className={tabletButtonClass('activity')} aria-expanded={tabletPanel === 'activity'} onClick={() => toggleTabletPanel('activity')}>
              Log & Chat
            </button>
            {isCitiesAndKnights ? (
              <button type="button" className={tabletButtonClass('decks')} aria-expanded={tabletPanel === 'decks'} onClick={() => toggleTabletPanel('decks')}>
                Decks
              </button>
            ) : null}
            {isDebugMode && currentPlayer ? (
              <button type="button" className={tabletButtonClass('debug')} aria-expanded={tabletPanel === 'debug'} onClick={() => toggleTabletPanel('debug')}>
                Debug
              </button>
            ) : null}
          </div>

          {tabletPanel ? (
            <div className="mt-2 max-h-[min(52dvh,32rem)] overflow-y-auto overscroll-contain rounded-lg" data-tablet-panel={tabletPanel}>
              {tabletPanel === 'status' ? (
                <CompactGameStatus gameState={gameState} currentPlayerId={playerId} onOpenCityManagement={onOpenPlayerCityManagement} />
              ) : null}
              {tabletPanel === 'activity' ? (
                <SidebarTabs logs={gameState.logs || []} diceStats={gameState.diceStats} eventDieStats={gameState.eventDieStats} players={gameState.players} gameState={gameState} roomId={gameState.roomId} playerId={playerId} />
              ) : null}
              {tabletPanel === 'decks' ? <ProgressDecksPanel gameState={gameState} /> : null}
              {tabletPanel === 'debug' && currentPlayer ? <DebugPanel player={currentPlayer} roomId={gameState.roomId} defaultOpen /> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Unified bottom tray (Phase 4). No overflow clipping in this chain so the
          progress-card shelf can escape upward; z-index sits above board layers. */}
      <div
        ref={trayRef}
        data-hud="tray"
        className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-full max-w-[min(96vw,1400px)] flex-col items-center gap-2 px-2 pointer-events-none max-xl:max-w-none max-xl:px-[max(0.5rem,env(safe-area-inset-left))]"
        style={{
          transform: 'translateX(-50%) scale(var(--hud-scale, 1))',
          transformOrigin: 'bottom center',
          // A transform shrinks painting, not layout — flex-wrap inside the
          // tray is still decided at the unscaled width, so a laptop-width tray
          // would wrap to two rows and stay tall. Lay it out 1/scale wider so
          // it keeps one row, then let the scale bring it back inside the
          // viewport. Desktop only; the tablet HUD has its own rules.
          ...(hud.isDesktop && hud.scale < 1
            ? {
              width: `calc(100% / ${hud.scale})`,
              maxWidth: `calc(min(96vw, 1400px) / ${hud.scale})`,
            }
            : {}),
        }}
      >
        <div className="pointer-events-auto max-xl:w-full max-xl:max-h-[40dvh] max-xl:overflow-x-auto max-xl:overflow-y-auto max-xl:overscroll-contain">
          {tray}
        </div>
      </div>
    </div>
  );
};
