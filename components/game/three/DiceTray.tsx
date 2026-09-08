'use client';

import { memo, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Euler, Quaternion, type Mesh, type OrthographicCamera, type PerspectiveCamera } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { GameState } from '@/lib/types/game';
import { shouldAnimateDiceRoll } from '@/lib/presentation/dice-events';
import { createDiceMaterials } from './dice/dice-materials';
import { WebGL2Gate } from '@/components/board/WebGL2Gate';
import { diceBounce, dieSupportHeight, dieValue, EVENT_TOP, settledDieQuaternion } from './dice/dice-topology';

export interface DiceTrayProps {
    diceRoll: GameState['diceRoll'];
    eventDieRoll?: GameState['eventDieRoll'];
    /** Accepted event identity, never a concatenation of the rolled faces. */
    rollKey: string | null;
    rollTimestamp?: number | null;
    serverTime?: number;
    reducedMotion?: boolean;
}

const EVENT_LABELS = { ship: 'Barbarian ship', science: 'Science', trade: 'Trade', politics: 'Politics' };
const FLOOR_Y = 0.075;
const REST_YAWS = [-0.19, 0.21, -0.11];
const ROLL_DURATION = 1.12;
const motionQuery = '(prefers-reduced-motion: reduce)';

/** Three owns this mutable camera; keep imperative scene updates outside hooks. */
function fitDiceCamera(camera: OrthographicCamera | PerspectiveCamera, width: number, height: number): void {
    camera.zoom = Math.min(width / 7, height / 4.4);
    camera.updateProjectionMatrix();
}

function subscribeToMotion(callback: () => void) {
    const query = window.matchMedia(motionQuery);
    query.addEventListener('change', callback);
    return () => query.removeEventListener('change', callback);
}

function DiceScene({ diceRoll, eventDieRoll, rollKey, rollTimestamp, serverTime, reducedMotion }: DiceTrayProps) {
    const invalidate = useThree(state => state.invalidate);
    const camera = useThree(state => state.camera);
    const size = useThree(state => state.size);
    const redRef = useRef<Mesh>(null);
    const secondRef = useRef<Mesh>(null);
    const eventRef = useRef<Mesh>(null);
    const previousKey = useRef(rollKey);
    const lastRollHadProduction = useRef(Boolean(diceRoll));
    const lastRollHadEvent = useRef(Boolean(eventDieRoll));
    const motion = useRef<{ startedAt: number; from: Quaternion[]; positions: [number, number][]; activeDice: boolean[] } | null>(null);
    const spin = useMemo(() => new Quaternion(), []);
    const spinEuler = useMemo(() => new Euler(), []);
    const materials = useMemo(() => createDiceMaterials(), []);
    const geometry = useMemo(() => ({
        die: new RoundedBoxGeometry(1.1, 1.1, 1.1, 4, 0.12),
        base: new RoundedBoxGeometry(5.94, 0.21, 3.4, 3, 0.08),
        felt: new RoundedBoxGeometry(5.53, 0.07, 2.99, 2, 0.03),
        longRail: new RoundedBoxGeometry(5.94, 0.38, 0.22, 3, 0.07),
        shortRail: new RoundedBoxGeometry(0.22, 0.38, 3.08, 3, 0.07),
    }), []);
    const firstValue = dieValue(diceRoll?.d1);
    const secondValue = dieValue(diceRoll?.d2);
    const eventFace = eventDieRoll?.face;
    const hasEvent = eventFace !== undefined;
    const animationIsAllowed = useEffectEvent((previous: string | null) => shouldAnimateDiceRoll(previous, rollKey, Boolean(reducedMotion), { timestamp: rollTimestamp, serverTime }));
    const targets = useMemo(() => [
        settledDieQuaternion(firstValue ?? 1, REST_YAWS[0]),
        settledDieQuaternion(secondValue ?? 1, REST_YAWS[1]),
        settledDieQuaternion(eventFace ? EVENT_TOP[eventFace] : 1, REST_YAWS[2]),
    ], [firstValue, secondValue, eventFace]);
    const positions = useMemo<[number, number][]>(() => hasEvent
        ? [[-1.72, 0.06], [-0.03, 0.21], [1.66, -0.07]]
        : [[-0.91, 0.05], [0.85, 0.16], [1.66, -0.07]], [hasEvent]);

    useEffect(() => () => {
        materials.dispose();
        Object.values(geometry).forEach(item => item.dispose());
    }, [materials, geometry]);

    useLayoutEffect(() => {
        if (!size.width || !size.height) return;
        fitDiceCamera(camera, size.width, size.height);
        invalidate();
    }, [camera, size.width, size.height, invalidate]);

    useLayoutEffect(() => {
        const meshes = [redRef.current, secondRef.current, eventRef.current];
        const shouldRoll = animationIsAllowed(previousKey.current) && !document.hidden;
        // An accepted event-only reveal locks Alchemist's event die. Selecting
        // production dice afterward must not suggest that the locked die rerolls.
        const completingLockedEvent = previousKey.current !== null && !lastRollHadProduction.current
            && lastRollHadEvent.current && firstValue !== null && secondValue !== null;
        const activeDice = [firstValue !== null, secondValue !== null, hasEvent && !completingLockedEvent];
        if (rollKey !== null) {
            previousKey.current = rollKey;
            lastRollHadProduction.current = firstValue !== null && secondValue !== null;
            lastRollHadEvent.current = hasEvent;
        }

        if (shouldRoll) {
            motion.current = {
                startedAt: performance.now(),
                from: meshes.map((mesh, i) => mesh?.quaternion.clone() ?? targets[i].clone()),
                positions: meshes.map((mesh, i) => mesh ? [mesh.position.x, mesh.position.z] : positions[i]),
                activeDice,
            };
            meshes.forEach((mesh, i) => {
                if (!mesh || activeDice[i]) return;
                mesh.quaternion.copy(targets[i]);
                mesh.position.set(positions[i][0], FLOOR_Y + 0.55, positions[i][1]);
            });
        } else {
            // A new snapshot, interrupted turn, or reduced-motion change settles
            // immediately. Neither game input nor state waits for this scene.
            motion.current = null;
            meshes.forEach((mesh, i) => {
                if (!mesh) return;
                mesh.quaternion.copy(targets[i]);
                mesh.position.set(positions[i][0], FLOOR_Y + 0.55, positions[i][1]);
            });
        }
        invalidate();
    }, [rollKey, reducedMotion, targets, positions, invalidate, firstValue, secondValue, hasEvent]);

    useEffect(() => {
        const onVisibility = () => {
            if (!document.hidden) {
                invalidate();
                return;
            }
            motion.current = null;
            [redRef.current, secondRef.current, eventRef.current].forEach((mesh, i) => {
                if (!mesh) return;
                mesh.quaternion.copy(targets[i]);
                mesh.position.set(positions[i][0], FLOOR_Y + 0.55, positions[i][1]);
            });
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [targets, positions, invalidate]);

    useFrame(() => {
        const active = motion.current;
        if (!active || document.hidden) return;
        const elapsed = (performance.now() - active.startedAt) / 1000;
        let unfinished = false;
        [redRef.current, secondRef.current, eventRef.current].forEach((mesh, index) => {
            if (!mesh || !active.activeDice[index]) return;
            const t = Math.min(1, elapsed / (ROLL_DURATION + index * 0.045));
            const remaining = (1 - t) ** 2;
            const ease = 1 - (1 - t) ** 3;
            const from = active.positions[index];
            const to = positions[index];
            mesh.quaternion.slerpQuaternions(active.from[index], targets[index], ease);
            spinEuler.set(Math.PI * 2 * (2 + index % 2) * remaining, 0, Math.PI * 4 * remaining * (index % 2 ? -1 : 1));
            spin.setFromEuler(spinEuler);
            mesh.quaternion.premultiply(spin);
            mesh.position.set(
                from[0] + (to[0] - from[0]) * ease + Math.sin(t * Math.PI * 2) * 0.19 * (1 - t),
                FLOOR_Y + dieSupportHeight(mesh.quaternion) + diceBounce(t),
                from[1] + (to[1] - from[1]) * ease - Math.sin(t * Math.PI) * 0.39 * (1 - t),
            );
            if (t < 1) unfinished = true;
            else {
                mesh.quaternion.copy(targets[index]);
                mesh.position.set(to[0], FLOOR_Y + 0.55, to[1]);
            }
        });
        if (unfinished) invalidate();
        else motion.current = null;
    });

    return (
        <>
            <ambientLight intensity={1.1} color="#e8f0e9" />
            <hemisphereLight args={['#fff0d1', '#34484b', 1.5]} />
            <directionalLight
                position={[-3, 7, 5]} intensity={3.2} color="#fff0d6" castShadow
                shadow-mapSize={[512, 512]} shadow-bias={-0.0002} shadow-normalBias={0.025}
                shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4}
                shadow-camera-near={0.5} shadow-camera-far={18}
            />
            <directionalLight position={[4, 3, -2]} intensity={0.65} color="#bddedb" />
            <group dispose={null}>
                <mesh geometry={geometry.base} material={materials.wood} position={[0, -0.08, 0]} receiveShadow />
                <mesh geometry={geometry.felt} material={materials.felt} position={[0, 0.035, 0]} receiveShadow />
                {[-1.59, 1.59].map(z => (
                    <mesh key={z} geometry={geometry.longRail} material={materials.wood} position={[0, 0.075, z]} castShadow receiveShadow />
                ))}
                {[-2.86, 2.86].map(x => (
                    <mesh key={x} geometry={geometry.shortRail} material={materials.wood} position={[x, 0.075, 0]} castShadow receiveShadow />
                ))}
                <mesh ref={redRef} geometry={geometry.die} material={firstValue ? materials.red : materials.blank} castShadow receiveShadow />
                <mesh ref={secondRef} geometry={geometry.die} material={secondValue ? (hasEvent ? materials.yellow : materials.ivory) : materials.blank} castShadow receiveShadow />
                <mesh ref={eventRef} geometry={geometry.die} material={materials.event} visible={hasEvent} castShadow receiveShadow />
            </group>
            {[-2.72, 2.72].flatMap(x => [-1.44, 1.44].map(z => (
                <mesh key={`${x}:${z}`} position={[x, 0.269, z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.047, 10]} />
                    <meshStandardMaterial color="#bd9750" metalness={0.7} roughness={0.3} />
                </mesh>
            )))}
        </>
    );
}

/** A purely cosmetic tray. Initial snapshots are shown settled, never replayed. */
function DiceTray({ diceRoll, eventDieRoll, rollKey, rollTimestamp, serverTime, reducedMotion }: DiceTrayProps) {
    const systemReducedMotion = useSyncExternalStore(
        subscribeToMotion,
        () => window.matchMedia(motionQuery).matches,
        () => true,
    );
    const label = [
        diceRoll ? `Dice: red ${diceRoll.d1}, ${eventDieRoll ? 'yellow' : 'ivory'} ${diceRoll.d2}. Total ${diceRoll.total}.` : 'Waiting for production dice.',
        eventDieRoll ? `Event die: ${EVENT_LABELS[eventDieRoll.face]}.` : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="relative h-[136px] w-[216px] max-w-full shrink-0 overflow-hidden rounded-[20px]" role="img" aria-label={label}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <WebGL2Gate><Canvas
                    orthographic shadows frameloop="demand" dpr={[1, 1.5]}
                    camera={{ position: [0, 8, 9], zoom: 31, near: 0.1, far: 40 }}
                    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
                    onCreated={({ camera, gl }) => {
                        camera.lookAt(0, 0.48, 0);
                        gl.setClearColor('#000000', 0);
                    }}
                >
                    <DiceScene diceRoll={diceRoll} eventDieRoll={eventDieRoll} rollKey={rollKey} rollTimestamp={rollTimestamp} serverTime={serverTime} reducedMotion={reducedMotion ?? systemReducedMotion} />
                </Canvas></WebGL2Gate>
            </div>
        </div>
    );
}

export default memo(DiceTray);
