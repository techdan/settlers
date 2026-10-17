'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { BoardLabel } from './BoardLabel';
import { Color, Group, OrthographicCamera, PCFShadowMap, Vector3, type WebGLRenderer } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { boardBounds, boardPorts, barbarianRoutePoints, edgePosition, tilePosition, vertexPosition, type BoardBounds, type GroundPoint } from '@/lib/presentation/board-geometry';
import type { BoardRendererProps } from '@/lib/types/board-renderer';
import { shade, TT } from '@/themes/tabletop/palette';
import { BoatArt, BuildingArt, HarborArt, HexFoundation, KnightArt, TerrainArt, TravelerArt } from './art';
import { playerPieceColor } from '@/lib/presentation/piece-style';
import { BoardSceneHud, type BoardCameraApi } from './BoardSceneHud';
import { edgeIsSelected, hexSelection, vertexIsSelected } from './scene-selection';
import { ProductionFeedback } from './ProductionFeedback';
import { WebGL2Gate } from '@/components/board/WebGL2Gate';

export interface BoardSceneProps extends BoardRendererProps { onUnavailable?: () => void }

const SEA = '#397c81';
const GOLD = '#efc568';
const VALID = '#fff1bc';
const CYAN = '#73e0db';
const CAMERA_OPTIONS = { position: [0, 10, 15] as [number, number, number], zoom: 45, near: .1, far: 100 };
const GL_OPTIONS = { antialias: true, alpha: false, powerPreference: 'high-performance' as const };
const SHADOW_OPTIONS = { type: PCFShadowMap };
const FULL_DPR: [number, number] = [1, 1.6];
const WATER_UNIFORMS = { baseColor: { value: new Color(SEA) }, waveColor: { value: new Color('#71a69f') } };
const WATER_VERTEX = 'varying vec2 ground; void main() { vec4 world = modelMatrix * vec4(position, 1.0); ground = world.xz; gl_Position = projectionMatrix * viewMatrix * world; }';
const WATER_FRAGMENT = `uniform vec3 baseColor; uniform vec3 waveColor; varying vec2 ground;
void main() {
  float waves = sin(ground.x * 3.2 + sin(ground.y * 1.1)) + sin(ground.y * 5.0 + sin(ground.x * .65));
  float crest = smoothstep(1.88, 1.99, waves);
  gl_FragColor = vec4(mix(baseColor, waveColor, crest * .22), 1.0);
  #include <colorspace_fragment>
}`;
const subscription = (callback: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const subscribeVisibility = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};
const serverFalse = () => false;
const serverTrue = () => true;

function groundTuple(p: GroundPoint, y = 0): [number, number, number] { return [p.x, y, p.z]; }

function ContextMonitor({ onUnavailable }: { onUnavailable?: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    let listening = true;
    const lost = (event: Event) => {
      event.preventDefault();
      // A retired Canvas can dispatch its disposal event after the renderer switch.
      if (listening && canvas.isConnected) onUnavailable?.();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => { listening = false; canvas.removeEventListener('webglcontextlost', lost); };
  }, [gl, onUnavailable]);
  return null;
}

function RendererMetrics({ outputRef }: { outputRef: RefObject<HTMLOutputElement | null> }) {
  const sample = useRef({ interval: 0, count: 0 });
  const pendingFrame = useRef<number | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    };
  }, []);
  useFrame(({ gl }, delta) => {
    if (delta < .2) { sample.current.interval += delta; sample.current.count++; }
    if (pendingFrame.current !== null) return;
    // Read after Fiber's render, including the final demand frame; no extra WebGL frame.
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      if (!mounted.current || !outputRef?.current) return;
      const interval = sample.current.count ? sample.current.interval / sample.current.count * 1000 : 0;
      const snapshot = {
        drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        frameIntervalMs: Number(interval.toFixed(1)), pixelRatio: gl.getPixelRatio(),
      };
      outputRef.current.dataset.rendererStats = JSON.stringify(snapshot);
      outputRef.current.textContent = `${snapshot.drawCalls} draws · ${snapshot.triangles.toLocaleString()} triangles · ${snapshot.geometries} geometries · ${snapshot.textures} textures · ${interval.toFixed(1)} ms active frame interval · DPR ${snapshot.pixelRatio}`;
      sample.current = { interval: 0, count: 0 };
    });
  });
  return null;
}

/** Three cameras are mutable engine objects; update their projection atomically. */
function updateCameraZoom(camera: OrthographicCamera, zoom: number) {
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

function CameraRig({ bounds, topDown, apiRef }: { bounds: BoardBounds; topDown: boolean; apiRef: RefObject<BoardCameraApi | null> }) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const fitZoom = useRef(45);
  const center = useMemo(() => new Vector3((bounds.minX + bounds.maxX) / 2, .12, (bounds.minZ + bounds.maxZ) / 2), [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ]);
  const fit = useCallback(() => {
    if (!(camera instanceof OrthographicCamera)) return;
    const offset = topDown ? new Vector3(0, 18, .01) : new Vector3(0, 10, 15);
    camera.position.copy(center).add(offset);
    camera.up.set(0, 1, 0);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    // Project the entire ground footprint and tallest scenery into the camera plane.
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [bounds.minX, bounds.maxX]) for (const y of [-.35, 1.25]) for (const z of [bounds.minZ, bounds.maxZ]) {
      const point = new Vector3(x, y, z).sub(center);
      const px = point.dot(right), py = point.dot(up);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    const usableWidth = Math.max(120, size.width - 28);
    const usableHeight = Math.max(100, size.height - (size.width < 640 ? 96 : 68));
    fitZoom.current = Math.max(9, Math.min(usableWidth / (maxX - minX), usableHeight / (maxY - minY)));
    updateCameraZoom(camera, fitZoom.current);
    if (controls.current) {
      controls.current.target.copy(center);
      controls.current.minZoom = fitZoom.current * .72;
      controls.current.maxZoom = fitZoom.current * 2.5;
      controls.current.update();
    }
    invalidate();
  }, [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, camera, center, invalidate, size.height, size.width, topDown]);
  useLayoutEffect(() => {
    fit();
    apiRef.current = {
      reset: fit,
      zoom: factor => {
        if (!(camera instanceof OrthographicCamera)) return;
        updateCameraZoom(camera, Math.max(fitZoom.current * .72, Math.min(fitZoom.current * 2.5, camera.zoom * factor)));
        invalidate();
      },
    };
    return () => { apiRef.current = null; };
  }, [apiRef, camera, fit, invalidate]);
  const clampPan = useCallback(() => {
    const control = controls.current;
    if (!control) return;
    const oldTarget = control.target.clone();
    control.target.x = Math.max(center.x - 2.3, Math.min(center.x + 2.3, control.target.x));
    control.target.z = Math.max(center.z - 2.3, Math.min(center.z + 2.3, control.target.z));
    control.target.y = center.y;
    camera.position.add(control.target.clone().sub(oldTarget));
  }, [camera, center]);
  return <OrbitControls ref={controls} makeDefault enableDamping={false} enableRotate={!topDown} screenSpacePanning={false}
    minPolarAngle={topDown ? 0 : .3} maxPolarAngle={Math.PI / 3.1} minAzimuthAngle={-.45} maxAzimuthAngle={.45}
    rotateSpeed={.45} zoomSpeed={.7} panSpeed={.6} onChange={clampPan} />;
}

/** Snapshots establish a baseline. Only a subsequent authoritative entity change settles. */
function Settle({ accepted, displayed, reducedMotion, children }: { accepted: string; displayed: string; reducedMotion: boolean; children: ReactNode }) {
  const group = useRef<Group>(null);
  const previous = useRef(accepted);
  const awaiting = useRef<string | null>(null);
  const elapsed = useRef(1);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const changed = previous.current !== accepted;
    previous.current = accepted;
    if (changed) awaiting.current = accepted || null;
    if (reducedMotion) {
      awaiting.current = null;
      elapsed.current = 1;
      group.current?.position.set(0, 0, 0);
      group.current?.scale.setScalar(1);
      return;
    }
    if (!awaiting.current || displayed !== awaiting.current) return;
    awaiting.current = null;
    elapsed.current = 0;
    invalidate();
  }, [accepted, displayed, invalidate, reducedMotion]);
  useFrame((_, delta) => {
    if (elapsed.current >= 1 || !group.current) return;
    elapsed.current = document.hidden || reducedMotion ? 1 : Math.min(1, elapsed.current + Math.min(delta, .05) / .28);
    const t = elapsed.current;
    group.current.position.y = .28 * (1 - t) ** 3;
    group.current.scale.setScalar(1 - .04 * Math.sin(t * Math.PI));
    if (t < 1) invalidate();
  });
  return <group ref={group}>{children}</group>;
}

function Ring({ radius, color, y = .06, hex = false }: { radius: number; color: string; y?: number; hex?: boolean }) {
  return <mesh rotation={[-Math.PI / 2, 0, hex ? Math.PI / 6 : 0]} position={[0, y, 0]} renderOrder={3}>
    <ringGeometry args={[radius - .035, radius, hex ? 6 : 40]} />
    <meshBasicMaterial color={color} transparent opacity={.95} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
  </mesh>;
}

function NumberToken({ value, rolled }: { value: number; rolled: boolean }) {
  const pips = Math.max(1, 6 - Math.abs(7 - value));
  return <group position={[0, .045, .27]}>
    <mesh receiveShadow castShadow><cylinderGeometry args={[.252, .27, .045, 36]} /><meshStandardMaterial color={rolled ? '#e7bb57' : '#ba9553'} roughness={.8} /></mesh>
    <mesh position={[0, .026, 0]} receiveShadow><cylinderGeometry args={[.23, .23, .012, 36]} /><meshStandardMaterial color={TT.token.face} roughness={1} /></mesh>
    <BoardLabel position={[0, .062, 0]} zIndexRange={[8, 0]}>
      <div className="flex h-8 min-w-7 flex-col items-center justify-center rounded-full text-center" style={{ color: value === 6 || value === 8 ? '#a43329' : '#3e3526', textShadow: '0 1px 2px #fff7de' }}>
        <span className="text-[17px] font-extrabold leading-[18px]">{value}</span>
        <span className="text-[8px] font-black leading-[7px] tracking-[-1px]" aria-hidden="true">{'•'.repeat(pips)}</span>
      </div>
    </BoardLabel>
  </group>;
}

function Coast({ tiles }: { tiles: BoardRendererProps['gameState']['board']['hexes'] }) {
  return <group>{tiles.map(tile => <group key={tile.id} position={groundTuple(tilePosition(tile), -.247)}>
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]}><ringGeometry args={[.98, 1.10, 6]} /><meshBasicMaterial color="#c0e1d2" transparent opacity={.32} depthWrite={false} /></mesh>
  </group>)}</group>;
}

function Harbor({ port }: { port: ReturnType<typeof boardPorts>[number] }) {
  const inward = port.angle * Math.PI / 180;
  const outwardRotation = Math.PI / 2 - (inward + Math.PI);
  const midpoint = port.vertices.length === 2 ? { x: (port.vertices[0].x + port.vertices[1].x) / 2, z: (port.vertices[0].z + port.vertices[1].z) / 2 } : port.position;
  const ratio = port.type === 'generic' ? '3:1' : '2:1';
  return <group>
    {port.vertices.map((vertex, index) => <Line key={index} points={[groundTuple(vertex, -.015), groundTuple(midpoint, -.025), groundTuple(port.position, -.07)]} color="#dccb98" lineWidth={2} transparent opacity={.85} />)}
    <group position={groundTuple(port.position)} rotation={[0, outwardRotation, 0]}><HarborArt type={port.type} /></group>
    <BoardLabel position={groundTuple(port.position, .7)} zIndexRange={[7, 0]}>
      <span className="whitespace-nowrap rounded-md border border-[#ebddb6]/70 bg-[#f3e8c9]/95 px-1.5 py-0.5 text-[10px] font-bold capitalize text-[#50442e] shadow-sm">{port.type === 'generic' ? 'Any' : port.type} {ratio}</span>
    </BoardLabel>
  </group>;
}

function BarbarianRoute({ points, position }: { points: GroundPoint[]; position: number }) {
  const step = Math.max(0, Math.min(7, position));
  return <group>
    <Line points={points.map(p => groundTuple(p, -.23))} color="#bfded6" lineWidth={1.5} dashed dashSize={.1} gapSize={.09} transparent opacity={.7} />
    {points.map((point, index) => <group key={index} position={groundTuple(point, -.225)}>
      <Ring radius={index === 7 ? .19 : .11} color={index <= step ? '#ebca83' : '#91bfbd'} y={0} />
      {index === 7 && <BoardLabel position={[0, .025, .35]} zIndexRange={[4, 0]}><span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[#f7dfb0]">Landfall</span></BoardLabel>}
    </group>)}
    <group position={groundTuple(points[step], -.26)} rotation={[0, .1, 0]} scale={.82}><BoatArt /></group>
  </group>;
}

function SceneContents({ board, reducedMotion, topDown, cameraApi, drag }: {
  board: BoardSceneProps; reducedMotion: boolean; topDown: boolean;
  cameraApi: RefObject<BoardCameraApi | null>; drag: RefObject<{ x: number; y: number; moved: boolean }>;
}) {
  const gl = useThree(state => state.gl);
  const [hovered, setHovered] = useState<string | null>(null);
  const { gameState, validation, selectionState, vertices, renderEdges, knightsMap, playerId, pendingPlacement } = board;
  const ports = useMemo(() => boardPorts(board.hexSize), [board.hexSize]);
  const route = useMemo(() => gameState.gameMode === 'cities_and_knights' ? barbarianRoutePoints(ports) : [], [gameState.gameMode, ports]);
  const bounds = useMemo(() => boardBounds(gameState.board.hexes, ports, route), [gameState.board.hexes, ports, route]);
  const colors = useMemo(() => new Map(gameState.players.map(player => [player.id, playerPieceColor(player.color)])), [gameState.players]);
  const authoritativeKnights = useMemo(() => new Map(board.authoritativeState?.players.flatMap(player => player.knights ?? []).map(knight => [knight.vertexId, knight]) ?? []), [board.authoritativeState?.players]);
  const inventorHexes = useMemo(() => new Set(gameState.lastInventorSwap?.hexes.map(hex => hex.id) ?? []), [gameState.lastInventorSwap?.hexes]);
  useEffect(() => { gl.domElement.style.setProperty('cursor', hovered ? 'pointer' : 'grab'); return () => { gl.domElement.style.removeProperty('cursor'); }; }, [gl, hovered]);

  function handlers(id: string, callback: () => void, enabled: boolean) {
    if (!enabled) return {};
    return {
      onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(id); },
      onPointerOut: () => setHovered(null),
      onClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta > 6 || drag.current.moved) return;
        callback();
      },
    };
  }

  return <>
    <color attach="background" args={[SEA]} />
    <ambientLight intensity={.75} color="#fff3d1" />
    <hemisphereLight args={['#f2edcf', '#447a79', 1.5]} />
    <directionalLight position={[-5, 10, 4]} intensity={2.4} color="#fff0cf" castShadow
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-8} shadow-camera-right={8}
      shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={.5} shadow-camera-far={30} shadow-normalBias={.035} shadow-bias={-.0003} />
    <CameraRig bounds={bounds} topDown={topDown} apiRef={cameraApi} />
    <ContextMonitor onUnavailable={board.onUnavailable} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.28, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} /><shaderMaterial uniforms={WATER_UNIFORMS} vertexShader={WATER_VERTEX} fragmentShader={WATER_FRAGMENT} toneMapped={false} />
    </mesh>
    <Suspense fallback={null}>
      <Coast tiles={gameState.board.hexes} />
      {gameState.board.hexes.map(tile => {
        const p = tilePosition(tile);
        const selectable = validation.validHexes.has(tile.id);
        const selected = hexSelection(board, tile.id);
        const pending = pendingPlacement?.type === 'robber' && pendingPlacement.id === tile.id;
        const rolled = gameState.diceRoll?.total === tile.numberToken && board.displayedRobberHexId !== tile.id;
        return <group key={tile.id} position={groundTuple(p)}>
          <HexFoundation terrain={tile.terrain} />
          <TerrainArt terrain={tile.terrain} seed={tile.id} />
          {tile.numberToken !== null && <NumberToken value={tile.numberToken} rolled={rolled} />}
          {rolled && <Ring radius={.89} color="#ead594" y={.025} hex />}
          {inventorHexes.has(tile.id) && <Ring radius={.82} color="#c3accf" y={.03} hex />}
          {(selectable || selected || pending || hovered === `h:${tile.id}`) && <Ring radius={.96} color={pending ? GOLD : selected === 'secondary' ? CYAN : selected ? GOLD : VALID} y={.04} hex />}
          {board.displayedRobberHexId === tile.id && <group position={[-.31, pending ? .15 : 0, .57]} scale={.9}><TravelerArt kind="robber" />{pending && <Ring radius={.24} color={GOLD} />}</group>}
          {gameState.merchantHexId === tile.id && <group position={[.31, 0, .57]} scale={.9}><TravelerArt kind="merchant" color={colors.get(gameState.activeMerchant ?? '')} /></group>}
          <mesh position={[0, .045, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]} {...handlers(`h:${tile.id}`, () => board.onHexClick(tile.id), selectable)}>
            <circleGeometry args={[.95, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>;
      })}
      {ports.map(port => <Harbor key={port.id} port={port} />)}
      {route.length > 0 && <BarbarianRoute points={route} position={gameState.barbarianPosition ?? 0} />}
      <group key={gameState.id}>
        {renderEdges.map(edge => {
          const valid = validation.validEdges.has(edge.id);
          const selected = edgeIsSelected(board, edge.id);
          const pending = pendingPlacement?.type === 'road' && pendingPlacement.id === edge.id;
          const roadHovered = hovered === `e:${edge.id}`;
          const guideEmphasis = selected || pending || roadHovered;
          const roadColor = colors.get(edge.owner ?? '') ?? '#ac9876';
          const source = board.authoritativeState?.board.edges[edge.id];
          const accepted = source?.structure ? `${source.structure}:${source.owner}` : '';
          const displayed = edge.structure ? `${edge.structure}:${edge.owner}` : '';
          const preview = pending || (!!displayed && displayed !== (gameState.board.edges[edge.id]?.structure ? `${gameState.board.edges[edge.id].structure}:${gameState.board.edges[edge.id].owner}` : ''));
          return <group key={edge.id} position={groundTuple(edgePosition(edge))} rotation={[0, -edge.d * Math.PI / 3, 0]}>
            <Settle accepted={accepted} displayed={displayed} reducedMotion={reducedMotion}>
              {edge.structure && <group position={[0, preview ? .115 : .045, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[.09, .075, .79]} /><meshStandardMaterial color={roadColor} roughness={.6} transparent={preview} opacity={preview ? .65 : 1} />
                </mesh>
                {[-.22, .22].map(z => <mesh key={z} position={[0, .0385, z]}>
                  <boxGeometry args={[.072, .002, .008]} /><meshStandardMaterial color={shade(roadColor, .78)} roughness={.9} transparent={preview} opacity={preview ? .65 : 1} />
                </mesh>)}
              </group>}
            </Settle>
            {(valid || guideEmphasis) && <mesh position={[0, .012, 0]}>
              <boxGeometry args={[guideEmphasis ? .15 : edge.structure ? .135 : .065, .01, guideEmphasis ? .85 : .76]} />
              <meshBasicMaterial color={pending || selected ? GOLD : '#fffdf4'} transparent opacity={selected || pending ? .78 : roadHovered ? .82 : edge.structure ? .55 : .56} depthWrite={false} />
            </mesh>}
            {(valid || selected) && <mesh position={[0, .18, 0]} {...handlers(`e:${edge.id}`, () => board.onEdgeClick(edge.id), true)}><boxGeometry args={[.25, .32, .78]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}
          </group>;
        })}
        {vertices.map(vertex => {
          const knight = knightsMap.get(vertex.id);
          const valid = validation.validVertices.has(vertex.id);
          const selected = vertexIsSelected(board, vertex.id, knight);
          const pending = pendingPlacement && pendingPlacement.type !== 'road' && pendingPlacement.type !== 'robber' && pendingPlacement.id === vertex.id;
          const owner = knight?.playerId ?? vertex.owner;
          const color = colors.get(owner ?? '') ?? colors.get(playerId) ?? '#dbbb82';
          const interactive = valid || selected || vertex.owner === playerId || knight?.playerId === playerId;
          const source = board.authoritativeState?.board.vertices[vertex.id];
          const sourceKnight = authoritativeKnights.get(vertex.id);
          const accepted = sourceKnight ? `knight:${sourceKnight.id}:${sourceKnight.level}` : source?.structure ? `${source.structure}:${source.owner}:${!!source.hasCityWall}` : '';
          const displayed = knight ? `knight:${knight.id}:${knight.level}` : vertex.structure ? `${vertex.structure}:${vertex.owner}:${!!vertex.hasCityWall}` : '';
          const original = gameState.board.vertices[vertex.id];
          const preview = !!pending || (!!vertex.structure && (vertex.structure !== original?.structure || vertex.hasCityWall !== original?.hasCityWall));
          return <group key={vertex.id} position={groundTuple(vertexPosition(vertex))}>
            {(valid || selected || pending || hovered === `v:${vertex.id}`) && <Ring radius={.34} color={pending || selected ? GOLD : selectionState.vertexCardSelection?.type === 'treason_place' ? CYAN : VALID} />}
            {!vertex.structure && !knight && valid && <mesh position={[0, .038, 0]}><cylinderGeometry args={[.12, .12, .035, 24]} /><meshBasicMaterial color={VALID} transparent opacity={.78} /></mesh>}
            <Settle accepted={accepted} displayed={displayed} reducedMotion={reducedMotion}>
              <group position={[0, preview ? .13 : 0, 0]}>
                {vertex.structure && <BuildingArt kind={vertex.structure} color={preview ? '#edcf89' : color} wall={vertex.hasCityWall} />}
                {knight && <KnightArt level={knight.level === 'basic' ? 1 : knight.level === 'strong' ? 2 : 3} active={knight.active} color={preview ? '#edcf89' : color} />}
              </group>
            </Settle>
            {preview && <Ring radius={.28} color={GOLD} y={.025} />}
            {interactive && <mesh position={[0, .45, 0]} {...handlers(`v:${vertex.id}`, () => board.onVertexClick(vertex.id), true)}><cylinderGeometry args={[.27, .27, .9, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}
          </group>;
        })}
      </group>
      <ProductionFeedback authoritativeState={board.authoritativeState} phase={gameState.phase} currentTurn={gameState.currentTurn} reducedMotion={reducedMotion} />
    </Suspense>
  </>;
}

export default function BoardScene(props: BoardSceneProps) {
  const [topDown, setTopDown] = useState(false);
  const cameraApi = useRef<BoardCameraApi | null>(null);
  const metrics = useRef<HTMLOutputElement | null>(null);
  const drag = useRef({ x: 0, y: 0, moved: false });
  const reducedMotion = useSyncExternalStore(subscription, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, serverFalse);
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, serverTrue);
  const prepareRenderer = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    gl.setClearColor(SEA);
    gl.domElement.setAttribute('aria-label', 'Interactive three dimensional Catan board. Keyboard board actions follow the view controls.');
    gl.domElement.setAttribute('role', 'img');
  }, []);

  return <div data-testid="board-3d" className="relative h-full min-h-0 w-full overflow-hidden" style={{ background: SEA }}
    onPointerDownCapture={event => { drag.current = { x: event.clientX, y: event.clientY, moved: false }; }}
    onPointerMoveCapture={event => { if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 6) drag.current.moved = true; }}>
    <WebGL2Gate><Canvas orthographic shadows={SHADOW_OPTIONS} frameloop={visible ? 'demand' : 'never'} dpr={FULL_DPR}
      camera={CAMERA_OPTIONS} gl={GL_OPTIONS} onCreated={prepareRenderer}
      fallback={<div className="flex h-full items-center justify-center p-8 text-center text-[#f5edda]">This device cannot display the 3D board.</div>}>
      <SceneContents board={props} reducedMotion={reducedMotion} topDown={topDown} cameraApi={cameraApi} drag={drag} />
      {process.env.NODE_ENV !== 'production' && <RendererMetrics outputRef={metrics} />}
    </Canvas></WebGL2Gate>
    <BoardSceneHud board={props} cameraApi={cameraApi} topDown={topDown} onTopDown={() => setTopDown(value => !value)} />
    {process.env.NODE_ENV !== 'production' && <details className="absolute left-3 top-28 z-20 max-w-64 rounded-md bg-[#173c43]/85 px-2 py-1 text-[10px] text-[#d9e6d9] max-sm:top-40">
      <summary className="cursor-pointer">Renderer diagnostics</summary>
      <output ref={metrics} className="block pt-1" aria-live="off">Waiting for the scene…</output>
      <span className="block pt-1 opacity-75">Idle rendering pauses; active frame interval is not a GPU benchmark.</span>
    </details>}
  </div>;
}
