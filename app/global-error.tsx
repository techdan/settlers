'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown by the root layout itself, which
 * `app/error.tsx` cannot catch because it renders *inside* that layout.
 *
 * This replaces the root layout entirely, so it must supply its own
 * <html>/<body> — and it cannot rely on globals.css having loaded. Hence the
 * inline styles rather than the usual --ui-* tokens.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled root error:', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#174f66',
                    color: '#f5efe0',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '1.5rem',
                }}
            >
                <div role="alert" style={{ maxWidth: '28rem' }}>
                    <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1rem' }}>
                        Your game is saved on the server. Reload to pull a fresh copy.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            minHeight: '2.75rem',
                            cursor: 'pointer',
                            borderRadius: '0.5rem',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            fontWeight: 600,
                            background: '#e0a23c',
                            color: '#2b1a05',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
