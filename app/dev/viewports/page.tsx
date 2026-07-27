import React from 'react';

/**
 * Dev-only responsive review page (not linked from the game).
 * http://localhost:3000/dev/viewports
 *
 * Each panel is a real iframe at a real device width, so the modals inside see a
 * genuine viewport — `dvh` units, safe-area insets, media queries, and flex
 * wrapping all behave exactly as they would on the device. jsdom cannot do this:
 * it has no layout engine, so a render test can never tell you what wrapped.
 *
 * The hand inside is the worst case on purpose: all eight card types at once.
 */

const VIEWPORTS = [
    { label: 'iPhone SE', w: 320, h: 640 },
    { label: 'iPhone 14', w: 390, h: 844 },
    { label: 'iPad portrait', w: 768, h: 1024 },
    { label: 'Desktop', w: 1024, h: 768 },
] as const;

const SURFACES = [
    { id: 'discard', label: 'Robber discard (8 card types)' },
    { id: 'trade', label: 'Trade — bank tab (8 card types)' },
    { id: 'picker', label: 'Resource Monopoly — single-pick radiogroup (md modal)' },
    { id: 'yop', label: 'Year of Plenty — tally of 2 beside a card face' },
] as const;

export default function ViewportHarnessPage() {
    return (
        <main className="min-h-screen bg-[#14100c] p-8 text-[#ede3cf]">
            <h1 className="mb-1 text-xl font-bold">Card-token rows — responsive review</h1>
            <p className="mb-8 text-sm text-[#a89a83]">
                Real components in real iframes. Look for: a token row overflowing sideways, a
                shoulder badge clipped by the scroll container, or a single orphan token stranded
                on its own row.
            </p>

            {SURFACES.map(surface => (
                <section key={surface.id} className="mb-12">
                    <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#c9973f]">
                        {surface.label}
                    </h2>
                    <div className="flex flex-wrap items-start gap-6">
                        {VIEWPORTS.map(vp => (
                            <figure key={vp.label} className="m-0">
                                <figcaption className="mb-2 text-xs text-[#a89a83]">
                                    {vp.label} — {vp.w}×{vp.h}
                                </figcaption>
                                <iframe
                                    title={`${surface.label} at ${vp.w}px`}
                                    src={`/dev/viewports/frame?surface=${surface.id}`}
                                    width={vp.w}
                                    height={vp.h}
                                    className="rounded border border-[#3d3226] bg-black"
                                />
                            </figure>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    );
}
