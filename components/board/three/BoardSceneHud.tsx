'use client';

import { type RefObject } from 'react';
import { getBarbarianForces } from '@/core/rules/barbarian-strength';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import { canCancelSelection, selectionInstruction } from './scene-selection';

export interface BoardCameraApi { zoom: (factor: number) => void; reset: () => void }

interface Props {
  board: BoardRendererProps;
  cameraApi: RefObject<BoardCameraApi | null>;
  topDown: boolean;
  onTopDown: () => void;
}

const button = 'cursor-pointer rounded-lg border border-[#dbcda9]/30 bg-[#f5edda]/95 px-3 py-2 text-xs font-semibold text-[#3d422f] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4bb65] disabled:cursor-wait disabled:opacity-60';

/** Semantic HTML remains available independently of the WebGL picking surface. */
export function BoardSceneHud({ board, cameraApi, topDown, onTopDown }: Props) {
  const { gameState, validation, vertices, renderEdges, knightsMap, playerId, pendingPlacement } = board;
  const targets = [
    ...gameState.board.hexes.filter(tile => validation.validHexes.has(tile.id)).map(tile => ({
      key: `hex-${tile.id}`, label: `${tile.terrain} ${tile.numberToken ?? 'desert'} · tile ${tile.hex.q}, ${tile.hex.r}`,
      choose: () => board.onHexClick(tile.id),
    })),
    ...renderEdges.filter(edge => validation.validEdges.has(edge.id)).map(edge => ({
      key: `edge-${edge.id}`, label: `${edge.structure ? 'Road' : 'Road site'} · ${edge.id}`,
      choose: () => board.onEdgeClick(edge.id),
    })),
    ...vertices.filter(vertex => validation.validVertices.has(vertex.id) || vertex.owner === playerId || knightsMap.get(vertex.id)?.playerId === playerId).map(vertex => {
      const knight = knightsMap.get(vertex.id);
      return {
        key: `vertex-${vertex.id}`,
        label: `${knight ? `${knight.active ? 'Active' : 'Inactive'} ${knight.level} knight` : vertex.structure ?? 'Building site'}${vertex.hasCityWall ? ' with wall' : ''} · ${vertex.id}`,
        choose: () => board.onVertexClick(vertex.id),
      };
    }),
  ];
  const forces = getBarbarianForces(gameState);
  const barbarianPosition = Math.min(7, Math.max(0, gameState.barbarianPosition ?? 0));
  const production = board.authoritativeState?.lastProduction;
  const productionSummary = production?.gains.map(gain => {
    const player = gameState.players.find(player => player.id === gain.playerId);
    const goods = [...Object.entries(gain.resources), ...Object.entries(gain.commodities)]
      .filter(([, amount]) => amount > 0).map(([type, amount]) => `${amount} ${type}`).join(', ');
    return `${player?.name ?? 'Player'} gained ${goods}`;
  }).join('. ');
  const instruction = selectionInstruction(board);

  return <>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{productionSummary ? `Production: ${productionSummary}.` : ''}</span>
    {instruction && <div className="pointer-events-none absolute inset-x-3 top-14 z-20 flex justify-center">
      <div className="max-w-lg rounded-xl border border-[#e8dcc0]/20 bg-[#193d42]/90 px-4 py-2 text-center text-xs leading-relaxed text-[#f4ecd8] shadow-md backdrop-blur-sm" role="status" aria-live="polite">
        {instruction}
      </div>
    </div>}

    <div className="absolute bottom-3 right-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-1.5" aria-label="3D board view controls">
      <button className={button} aria-label="Zoom out" title="Zoom out" onClick={() => cameraApi.current?.zoom(1 / 1.18)}>−</button>
      <button className={button} aria-label="Zoom in" title="Zoom in" onClick={() => cameraApi.current?.zoom(1.18)}>+</button>
      <button className={button} onClick={() => cameraApi.current?.reset()}>Reset view</button>
      <button className={button} aria-pressed={topDown} onClick={onTopDown}>{topDown ? 'Angled view' : 'Top down'}</button>
    </div>

    {pendingPlacement && <div className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-xl border border-[#e8dcc0]/50 bg-[#193d42]/95 p-2 shadow-lg" role="group" aria-label="Placement confirmation">
      <button className={`${button} !bg-[#f0ce85]`} disabled={board.placementBusy} onClick={board.onConfirmPlacement}>{board.placementBusy ? 'Placing…' : `Confirm ${pendingPlacement.type.replaceAll('_', ' ')}`}</button>
      <button className={button} disabled={board.placementBusy} onClick={board.onCancelPlacement}>Cancel</button>
    </div>}
    {!pendingPlacement && canCancelSelection(board) && <button className={`${button} absolute bottom-36 left-3 z-30`} onClick={board.onCancelBuild}>Cancel selection</button>}

    {targets.length > 0 && <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:bottom-16 focus-within:right-3 focus-within:z-30 focus-within:max-h-[55%] focus-within:max-w-[calc(100%-1.5rem)] focus-within:overflow-y-auto">
      <section aria-label="Keyboard board actions" className="w-72 max-w-full rounded-xl border border-[#e8dcc0]/50 bg-[#f5edda] p-3 text-[#3d422f] shadow-xl">
        <h3 className="mb-2 text-sm font-semibold">Choose a board site</h3>
        <p className="mb-3 text-xs">Use Tab and Enter to choose.</p>
        <div className="grid gap-1.5">{targets.map(target => <button key={target.key} className={`${button} text-left`} onClick={target.choose}>{target.label}</button>)}</div>
      </section>
    </div>}

    {gameState.gameMode === 'cities_and_knights' && <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-48 rounded-lg bg-[#193d42]/75 px-3 py-2 text-[11px] leading-relaxed text-[#f5edda] max-sm:top-16" aria-label="Barbarian status">
      <span className="font-semibold">Barbarians · {barbarianPosition}/7</span>
      <span className="block">Knights {forces.knights} · Cities {forces.cities}</span>
      {gameState.phase === 'barbarian_city_selection' ? <span className="block text-[#ffcb9e]">Attack in progress</span> : gameState.skipFirstBarbarianAttack && !gameState.hasBarbariansAttacked ? <span className="block">First attack skipped</span> : <span className="block">{7 - barbarianPosition} ship rolls until landfall</span>}
    </div>}
  </>;
}
