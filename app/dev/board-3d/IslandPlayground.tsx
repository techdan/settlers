'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hammer, RotateCcw, Dices, Anchor } from 'lucide-react';
import { BoardPresentation } from '@/components/board/BoardPresentation';
import { DiceDisplay } from '@/components/game/ui/DiceDisplay';
import { PlayerHand } from '@/components/game/player/PlayerHand';
import { CompactGameStatus } from '@/components/game/ui/CompactGameStatus';
import { GameLog } from '@/components/game/ui/GameLog';
import { createIslandPreview } from '@/lib/presentation/preview-fixture';
import { distributeResources } from '@/core/engine/resources/resource-manager';
import { distributeCommodities } from '@/core/engine/resources/commodity-manager';
import { createProductionEvent } from '@/core/engine/resources/production-event';
import type { PendingBoardPlacement, BuildMode } from '@/lib/types/board-selection-state';
import type { DiceTotal, ProductionSource } from '@/lib/types/game';

const BUTTON = 'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cbb57e]/25 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e0bc6b]';
const desktopQuery = '(min-width: 1024px)';
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;

export function IslandPlayground() {
  const [game, setGame] = useState(createIslandPreview);
  const [mode, setMode] = useState<BuildMode | null>(null);
  const [pending, setPending] = useState<PendingBoardPlacement | null>(null);
  const isDesktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => true);
  const [journalOverride, setJournalOverride] = useState<boolean | null>(null);
  const showJournal = journalOverride ?? isDesktop;
  const [rollIndex, setRollIndex] = useState(0);
  const vertices = useMemo(() => Object.values(game.board.vertices).map(vertex => pending?.id === vertex.id && pending.type !== 'road' && pending.type !== 'robber' ? { ...vertex, owner: 'you', structure: pending.type === 'city' ? 'city' as const : 'settlement' as const } : vertex), [game.board.vertices, pending]);
  const edges = useMemo(() => Object.values(game.board.edges).map(edge => pending?.id === edge.id && pending.type === 'road' ? { ...edge, owner: 'you', structure: 'road' as const } : edge), [game.board.edges, pending]);
  const knights = useMemo(() => new Map(game.players.flatMap(player => player.knights ?? []).map(knight => [knight.vertexId, knight])), [game.players]);
  const validVertices = useMemo(() => new Set(Object.values(game.board.vertices).filter(vertex => mode === 'settlement' ? !vertex.structure && !knights.has(vertex.id) : mode === 'city' ? vertex.structure === 'settlement' && vertex.owner === 'you' : false).map(vertex => vertex.id)), [game.board.vertices, knights, mode]);
  const validEdges = useMemo(() => new Set(Object.values(game.board.edges).filter(edge => mode === 'road' && !edge.owner).map(edge => edge.id)), [game.board.edges, mode]);
  const cancel = () => { setPending(null); setMode(null); };
  const confirm = () => {
    if (!pending) return;
    setGame(current => {
      const next = structuredClone(current);
      if (pending.type === 'road') Object.assign(next.board.edges[pending.id], { owner: 'you', structure: 'road' });
      else Object.assign(next.board.vertices[pending.id], { owner: 'you', structure: pending.type });
      next.logs.push({ id: `build-${next.logs.length}`, timestamp: Date.now(), playerId: 'you', message: `You placed a ${pending.type}.` });
      return next;
    });
    cancel();
  };
  const roll = () => {
    const faces = [[3, 3], [5, 3], [4, 5], [2, 3], [4, 6], [1, 3]][rollIndex % 6];
    setRollIndex(index => index + 1);
    setGame(current => {
      const next = structuredClone(current);
      const total = (faces[0] + faces[1]) as DiceTotal;
      next.diceRoll = { d1: faces[0], d2: faces[1], total };
      next.diceStats![total]++;
      next.eventDieRoll = { face: rollIndex % 3 === 0 ? 'ship' : 'science', timestamp: rollIndex + 2 };
      next.eventDieStats![next.eventDieRoll.face]++;
      if (next.eventDieRoll.face === 'ship') next.barbarianPosition = ((next.barbarianPosition ?? 0) + 1) % 8;
      const sources: ProductionSource[] = [];
      const resources = distributeResources(next, total, sources);
      const commodities = distributeCommodities(next, total, sources);
      next.lastProduction = createProductionEvent(next, total, resources, commodities, sources);
      next.logs.push({ id: `roll-${rollIndex}`, timestamp: Date.now(), playerId: 'you', message: `You rolled ${total}.` });
      return next;
    });
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#182e31] text-[#f3e9cf]">
      <header className="z-30 flex shrink-0 items-center justify-between border-b border-[#b69a62]/25 bg-[#202c2b] px-5 py-3">
        <div className="flex items-center gap-4"><Link href="/" aria-label="Return to lobby" className="cursor-pointer rounded-lg p-2 hover:bg-white/10"><ArrowLeft size={18} /></Link><div><h1 className="font-serif text-xl tracking-wide">Settlers of Lanc</h1><p className="text-[10px] uppercase tracking-[.25em] text-[#c4b891]">The harbor table</p></div></div>
        <div className="flex items-center gap-3"><span className="hidden rounded-full border border-[#cbb57e]/30 px-3 py-1 text-xs text-[#d9c79d] sm:block">3D art playground · local only</span><button className={BUTTON} aria-expanded={showJournal} aria-controls="preview-player-rail" onClick={() => setJournalOverride(!showJournal)}>Players</button></div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <BoardPresentation preview gameState={game} authoritativeState={game} hexSize={90} playerId="you" vertices={vertices} renderEdges={edges} knightsMap={knights} selectionState={{ buildMode: mode }} validation={{ validVertices, validEdges, validHexes: new Set() }} pendingPlacement={pending} displayedRobberHexId={game.robberHexId}
            onVertexClick={id => { if (validVertices.has(id) && mode && mode !== 'road') setPending({ type: mode, id, phase: 'main' }); }}
            onEdgeClick={id => { if (validEdges.has(id)) setPending({ type: 'road', id, phase: 'main' }); }} onHexClick={() => {}} onConfirmPlacement={confirm} onCancelPlacement={() => setPending(null)} onCancelBuild={cancel} />
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-2xl border border-[#d0b779]/25 bg-[#203b3c]/90 p-4 shadow-xl backdrop-blur-md max-sm:hidden">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-[#e0bc6b]"><Anchor size={14} /> Explore your island</div>
            <p className="font-serif text-lg">{mode ? `Choose a place for your ${mode}.` : 'Every shore is a beginning.'}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#c5d0c6]">{mode ? 'Glowing sites are available. Confirm your choice to see your piece settle into place.' : 'Drag to orbit. Scroll to discover the little details. Try a building, then let the dice decide.'}</p>
          </div>
        </div>
        {showJournal && <aside id="preview-player-rail" aria-label="Players and chronicle" className="z-40 flex w-80 max-w-[calc(100%-1rem)] shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain border-l border-[#b69a62]/20 bg-[#202c2b] p-3 [scrollbar-width:thin] max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:bg-[#202c2b]/95">
          <div className="shrink-0"><CompactGameStatus gameState={game} currentPlayerId="you" presentation="three" /></div>
          <details open className="shrink-0 border-t border-[#b69a62]/20 pt-2">
            <summary className="cursor-pointer text-xs font-semibold text-[#d8c99f] focus-visible:outline-2 focus-visible:outline-[#e0bc6b]">Chronicle</summary>
            <div className="mt-1.5 h-[clamp(8rem,20vh,14rem)]"><GameLog logs={game.logs} players={game.players} /></div>
          </details>
          <p className="mt-auto pt-1 text-[10px] leading-relaxed text-[#a8b3a5]">A visual sandbox. Placements are unrestricted; preview players are not AI opponents. Live games use the existing rules.</p>
        </aside>}
      </div>
      <footer className="z-30 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 overflow-x-auto border-t border-[#b69a62]/30 bg-[#202c2b] px-4 py-2 max-sm:grid-cols-[auto_1fr_auto] max-sm:gap-2">
        <div className="flex flex-col gap-1">{(['road', 'settlement', 'city'] as const).map(kind => <button key={kind} className={`${BUTTON} !min-h-8 !py-1 ${mode === kind ? 'bg-[#e0bc6b]/20 ring-1 ring-[#e0bc6b]' : ''}`} aria-pressed={mode === kind} onClick={() => { setPending(null); setMode(mode === kind ? null : kind); }}><Hammer size={15} /><span className="capitalize">{kind}</span></button>)}</div>
        <div className="flex min-w-0 justify-start overflow-x-auto py-3" aria-label="Resources and commodities"><PlayerHand player={game.players[0]} roomId="preview" /></div>
        <div className="max-sm:hidden"><DiceDisplay diceRoll={game.diceRoll} eventDieRoll={game.eventDieRoll} authoritativeState={game} forceThree /></div>
        <div className="flex flex-col gap-2"><button className={`${BUTTON} font-semibold text-[#302b1e]`} style={{ backgroundColor: '#e0bc6b' }} onClick={roll}><Dices size={18} />Roll dice</button>
        <button className={BUTTON} aria-label="Reset preview" onClick={() => { setGame(createIslandPreview()); setRollIndex(0); cancel(); }}><RotateCcw size={16} />Reset</button></div>
      </footer>
    </main>
  );
}
