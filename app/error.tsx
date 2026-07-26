'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * Without this, an uncaught render error unmounts the whole tree and leaves a
 * blank page — the worst outcome mid-game, because the player cannot tell
 * whether their turn was saved. Game state lives in the database, so recovering
 * is just a re-render: `reset()` retries the segment without a full reload, and
 * a hard reload re-fetches authoritative state from the server.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled error:', error);
    }, [error]);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[var(--ui-bg)] p-6">
            <div
                role="alert"
                className="w-full max-w-md rounded-xl border-2 border-[var(--ui-danger)] bg-[var(--ui-panel-solid)] p-6 text-[var(--ui-text)] shadow-2xl"
            >
                <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
                <p className="mb-4 text-sm text-[var(--ui-muted)]">
                    Your game is saved on the server — nothing was lost. Try again, and if the
                    problem sticks around, reload the page to pull a fresh copy of the game.
                </p>

                {error.digest && (
                    <p className="mb-4 font-mono text-xs text-[var(--ui-muted)]">
                        Reference: {error.digest}
                    </p>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="min-h-11 flex-1 cursor-pointer rounded-lg bg-[var(--ui-accent)] px-4 py-2 font-semibold text-[var(--ui-accent-ink)] transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                    >
                        Try again
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="min-h-11 flex-1 cursor-pointer rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-4 py-2 font-semibold text-[var(--ui-text)] transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                    >
                        Reload
                    </button>
                </div>
            </div>
        </div>
    );
}
