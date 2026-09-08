'use client';

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Group, SRGBColorSpace, Vector3 } from 'three';
import { getHexesForVertex } from '@/lib/hex';
import { tilePosition, vertexPosition } from '@/lib/presentation/board-geometry';
import { isPresentationEventFresh } from '@/lib/presentation/event-freshness';
import type { GameState } from '@/lib/types/game';

const GOODS: Record<string, { color: string; label: string }> = {
  wood: { color: '#4b8256', label: 'wood' }, brick: { color: '#bd6d44', label: 'brick' },
  sheep: { color: '#a5c66e', label: 'sheep' }, wheat: { color: '#dab557', label: 'wheat' },
  ore: { color: '#918c87', label: 'ore' }, paper: { color: '#ded7ad', label: 'paper' },
  cloth: { color: '#84a7b3', label: 'cloth' }, coin: { color: '#dfb448', label: 'coin' },
};

function ParcelLabel({ amount, type }: { amount: number; type: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 72;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#f9edcf';
      context.beginPath(); context.roundRect(2, 2, 252, 68, 20); context.fill();
      context.strokeStyle = '#86734c'; context.lineWidth = 3; context.stroke();
      context.font = 'bold 35px Georgia, serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = '#3d4230'; context.fillText(`+${amount} ${GOODS[type]?.label ?? type}`, 128, 37);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [amount, type]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, .22, 0]} scale={[.68, .2, 1]} renderOrder={5}><spriteMaterial map={texture} depthTest={false} transparent /></sprite>;
}

/** Finite cosmetics from exact resolved production. Initial snapshots never replay. */
export function ProductionFeedback({ authoritativeState, phase, currentTurn, reducedMotion }: {
  authoritativeState?: GameState; phase: GameState['phase']; currentTurn: string; reducedMotion: boolean;
}) {
  const event = authoritativeState?.lastProduction;
  const eventId = event?.id;
  const root = useRef<Group>(null);
  const parcels = useRef<(Group | null)[]>([]);
  const previous = useRef(eventId);
  const active = useRef<{ startsAt: number; turn: string } | null>(null);
  const invalidate = useThree(state => state.invalidate);
  const eventCanAnimate = useEffectEvent(() => isPresentationEventFresh(event?.timestamp, authoritativeState?.timerServerTime));
  const paths = useMemo(() => {
    if (!authoritativeState || !event) return [];
    // Group repeated awards by tile/player/good while preserving exact quantities.
    const sources = new Map<string, (typeof event.sources)[number]>();
    for (const source of event.sources) {
      const key = `${source.hexId}:${source.playerId}:${source.kind}:${source.type}`;
      const existing = sources.get(key);
      sources.set(key, existing ? { ...existing, amount: existing.amount + source.amount } : { ...source });
    }
    return [...sources.entries()].flatMap(([id, source]) => {
      const tile = authoritativeState.board.hexes.find(tile => tile.id === source.hexId);
      if (!tile) return [];
      const origin = tilePosition(tile);
      const recipient = Object.values(authoritativeState.board.vertices).find(vertex => vertex.owner === source.playerId && vertex.structure
        && getHexesForVertex(vertex.q, vertex.r, vertex.d).some(hex => hex.q === tile.hex.q && hex.r === tile.hex.r));
      const playerIndex = Math.max(0, authoritativeState.players.findIndex(player => player.id === source.playerId));
      const target = recipient ? vertexPosition(recipient) : { x: (playerIndex - 1.5) * 1.4, z: 4.6 };
      return [{ id, source, from: new Vector3(origin.x, .25, origin.z + .08), to: new Vector3(target.x, .35, target.z) }];
    });
  }, [authoritativeState, event]);

  useLayoutEffect(() => {
    if (root.current) root.current.visible = false;
    active.current = null;
    const fresh = !!eventId && eventId !== previous.current;
    previous.current = eventId;
    if (!fresh || !eventCanAnimate() || !paths.length || reducedMotion || document.hidden || (phase !== 'main_phase' && phase !== 'waiting_for_roll')) return;
    active.current = { startsAt: performance.now() + 800, turn: currentTurn };
    const timer = window.setTimeout(() => invalidate(), 805);
    return () => window.clearTimeout(timer);
  }, [eventId, currentTurn, phase, reducedMotion, invalidate, paths.length]);

  useEffect(() => {
    const cancel = () => {
      if (!document.hidden) return;
      active.current = null;
      if (root.current) root.current.visible = false;
    };
    document.addEventListener('visibilitychange', cancel);
    return () => document.removeEventListener('visibilitychange', cancel);
  }, []);

  useFrame(() => {
    const cue = active.current;
    if (!cue || !root.current) return;
    if (document.hidden || reducedMotion || cue.turn !== currentTurn || (phase !== 'main_phase' && phase !== 'waiting_for_roll')) {
      active.current = null; root.current.visible = false; return;
    }
    const elapsed = (performance.now() - cue.startsAt) / 1000;
    if (elapsed < 0) return;
    if (elapsed >= 1.05) { root.current.visible = false; active.current = null; return; }
    root.current.visible = true;
    paths.forEach((path, index) => {
      const parcel = parcels.current[index];
      if (!parcel) return;
      const t = Math.min(1, Math.max(0, elapsed));
      parcel.position.lerpVectors(path.from, path.to, t * t * (3 - 2 * t));
      parcel.position.y += Math.sin(t * Math.PI) * .8;
      parcel.scale.setScalar(Math.min(1, t * 9, (1.05 - elapsed) * 9));
      parcel.rotation.y = t * .45;
    });
    invalidate();
  });

  if (!event || reducedMotion) return null;
  return <group ref={root} visible={false}>
    {paths.map((path, index) => <group key={path.id}>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} position={[path.from.x, .055, path.from.z - .08]}><ringGeometry args={[.87, .93, 6]} /><meshBasicMaterial color="#f5d179" transparent opacity={.7} depthWrite={false} /></mesh>
      <group ref={node => { parcels.current[index] = node; }}>
        <mesh><boxGeometry args={[.16, .15, .14]} /><meshStandardMaterial color={GOODS[path.source.type]?.color ?? '#e9cc85'} roughness={path.source.kind === 'commodity' ? .32 : .85} metalness={path.source.kind === 'commodity' ? .2 : 0} /></mesh>
        <ParcelLabel amount={path.source.amount} type={path.source.type} />
      </group>
    </group>)}
  </group>;
}
