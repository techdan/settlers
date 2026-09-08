'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { probeWebGL2, type WebGL2Capability } from '@/lib/presentation/webgl-capability';

/** Keep Canvas unmounted until capability is known; the existing boundary owns fallback. */
export function WebGL2Gate({ children }: { children: ReactNode }) {
    const [capability, setCapability] = useState<WebGL2Capability | null>(null);
    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            const result = probeWebGL2();
            if (!cancelled) setCapability(result);
        });
        return () => { cancelled = true; };
    }, []);

    // Convert the failed probe into a synchronous React error. Both the board
    // and dice already have boundaries with usable Classic renderers.
    if (capability && !capability.supported) throw capability.error;
    return capability?.supported ? children : null;
}
