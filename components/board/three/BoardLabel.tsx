'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';

/** Screen-space labels whose DOM roots can safely outlive a scene commit. */
export function BoardLabel({ children, position, zIndexRange = [8, 0], style }: {
    children: ReactNode;
    position: [number, number, number];
    zIndexRange?: [number, number];
    style?: CSSProperties;
}) {
    const group = useRef<Group>(null);
    const element = useRef<HTMLDivElement | null>(null);
    const root = useRef<Root | null>(null);
    const point = useRef(new Vector3());
    const { gl, invalidate } = useThree();

    useLayoutEffect(() => {
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        gl.domElement.parentElement?.appendChild(container);
        const mountedRoot = createRoot(container);
        element.current = container;
        root.current = mountedRoot;
        invalidate();
        return () => {
            root.current = null;
            element.current = null;
            // React cannot unmount a DOM root during the R3F commit. Give each
            // effect setup its own container so StrictMode cleanup is safe too.
            queueMicrotask(() => { mountedRoot.unmount(); container.remove(); });
        };
    }, [gl, invalidate]);

    useLayoutEffect(() => {
        root.current?.render(<div style={{ transform: 'translate(-50%, -50%)', ...style }}>{children}</div>);
    });

    useFrame(({ camera, size }) => {
        if (!group.current || !element.current) return;
        group.current.getWorldPosition(point.current);
        const distance = point.current.distanceTo(camera.position);
        point.current.project(camera);
        const label = element.current;
        label.style.display = point.current.z < -1 || point.current.z > 1 ? 'none' : '';
        label.style.transform = `translate3d(${(point.current.x + 1) * size.width / 2}px,${(1 - point.current.y) * size.height / 2}px,0)`;
        label.style.zIndex = String(Math.round(zIndexRange[0] + (zIndexRange[1] - zIndexRange[0]) * (distance - camera.near) / (camera.far - camera.near)));
    });

    return <group ref={group} position={position} />;
}
