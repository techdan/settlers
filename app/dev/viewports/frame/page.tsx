import React from 'react';
import { ViewportFrame } from './ViewportFrame';

/**
 * Server shell so the surface is chosen during render, not in a client effect —
 * otherwise every iframe renders the default modal first and swaps after
 * hydration, which both flashes and makes the served HTML useless to check.
 */
export default async function ViewportFramePage({
    searchParams,
}: {
    searchParams: Promise<{ surface?: string }>;
}) {
    const { surface } = await searchParams;
    return <ViewportFrame surface={surface ?? 'discard'} />;
}
