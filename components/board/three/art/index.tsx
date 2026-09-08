'use client';

import { memo, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh, MeshStandardMaterial, type Material } from 'three';
import type { TerrainType } from '@/core/rules/board-constants';
import type { PortType } from '@/lib/types/board';

const MODEL_ROOT = '/models/tabletop/';
// Keep the scenery below the pieces without changing its ground footprint.
const RELIEF_HEIGHT: Record<TerrainType, number> = {
    mountain: .62, forest: .70, hill: .86, pasture: 1, field: 1, desert: 1,
};

/** Stable art variation; never rotates into the number-token clearance. */
function variantFor(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    }
    return (hash >>> 0) % 2;
}

/**
 * Geometry and unpainted materials belong to Drei's URL cache. Each mounted
 * miniature owns only its scene graph and optional player-paint material.
 * dispose=null prevents one tile unmount from disposing another tile's geometry.
 */
const Miniature = memo(function Miniature({ name, color }: { name: string; color?: string }) {
    const { scene } = useGLTF(`${MODEL_ROOT}${name}.glb`);
    const { object, paint } = useMemo(() => {
        const object = scene.clone(true);
        const paint = new Map<Material, MeshStandardMaterial>();
        const recolor = (source: Material): Material => {
            if (!color || !(source instanceof MeshStandardMaterial)) return source;
            let painted = source.name.startsWith('owner-paint') ? color : undefined;
            // The roof's checked-in material name lets owner paint read from above.
            // Original timber, stone bases, and cached terrain materials stay intact.
            if (name.startsWith('building-') && source.name === 'paint-6c4e31') painted = color;
            if (!painted) return source;
            let material = paint.get(source);
            if (!material) {
                material = source.clone();
                material.color.set(painted);
                if (name.startsWith('building-') && source.name === 'paint-6c4e31') material.roughness = .72;
                paint.set(source, material);
            }
            return material;
        };
        object.traverse((node) => {
            if (!(node instanceof Mesh)) return;
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = Array.isArray(node.material)
                ? node.material.map(recolor)
                : recolor(node.material);
        });
        return { object, paint };
    }, [scene, color, name]);

    useEffect(() => () => {
        for (const material of paint.values()) material.dispose();
    }, [paint]);

    return <primitive object={object} dispose={null} />;
});

/** Radius .979, bottom y=-.25, top exactly y=0; pointy-top hex. */
export const HexFoundation = memo(function HexFoundation({ terrain }: { terrain: TerrainType }) {
    return <Miniature name={`foundation-${terrain}`} />;
});

/** Grounded relief leaves a clear .33-radius token area centered at z=.27. */
export const TerrainArt = memo(function TerrainArt({ terrain, seed }: { terrain: TerrainType; seed: string }) {
    return <group scale={[1, RELIEF_HEIGHT[terrain], 1]}><Miniature name={`terrain-${terrain}-${variantFor(seed)}`} /></group>;
});

/** Place at port center and rotate local +Z out to sea; deck y=-.078. */
export const HarborArt = memo(function HarborArt({ type }: { type: PortType }) {
    return <Miniature name={`harbor-${type}`} />;
});

export const BuildingArt = memo(function BuildingArt({ kind, color, wall = false }: {
    kind: 'settlement' | 'city' | 'metropolis';
    color: string;
    wall?: boolean;
}) {
    return (
        <group>
            <Miniature name={`building-${kind}`} color={color} />
            {wall ? <Miniature name="city-wall" color={color} /> : null}
        </group>
    );
});

export const KnightArt = memo(function KnightArt({ level, active, color }: {
    level: number;
    active: boolean;
    color: string;
}) {
    const tier = Math.min(3, Math.max(1, Math.round(level)));
    return <group scale={[1, 1.12, 1]}><Miniature name={`knight-${tier}-${active ? 1 : 0}`} color={color} /></group>;
});

export const TravelerArt = memo(function TravelerArt({ kind, color }: {
    kind: 'robber' | 'merchant';
    color?: string;
}) {
    return <Miniature name={`traveler-${kind}`} color={color} />;
});

/** Boat origin is its waterline; world water level should be added by caller. */
export const BoatArt = memo(function BoatArt() {
    return <Miniature name="barbarian-boat" />;
});
