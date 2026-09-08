import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PresentationBoundary } from '@/components/board/PresentationBoundary';
import { WebGL2Gate } from '@/components/board/WebGL2Gate';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function renderGate() {
    const childMounted = vi.fn();
    const unavailable = vi.fn();
    function CanvasStandIn() {
        childMounted();
        return <div>3D canvas mounted</div>;
    }
    const view = render(
        <PresentationBoundary fallback={<div>Classic view is available</div>} onUnavailable={unavailable}>
            <WebGL2Gate><CanvasStandIn /></WebGL2Gate>
        </PresentationBoundary>
    );
    return { ...view, childMounted, unavailable };
}

describe('WebGL2 initialization gate', { timeout: 15_000 }, () => {
    it('activates the existing Classic fallback before mounting a canvas when WebGL2 is unsupported', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        const { childMounted, unavailable } = renderGate();

        await screen.findByText('Classic view is available');
        expect(childMounted).not.toHaveBeenCalled();
        expect(unavailable).toHaveBeenCalledTimes(1);
        expect(getContext).toHaveBeenCalledWith('webgl2', { powerPreference: 'low-power' });
    });

    it('turns a thrown context-creation exception into the same controlled fallback', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
            throw new Error('GPU context allocation failed');
        });
        const { childMounted, unavailable } = renderGate();

        await screen.findByText('Classic view is available');
        expect(childMounted).not.toHaveBeenCalled();
        expect(unavailable).toHaveBeenCalledTimes(1);
    });

    it('releases the probe context and buffer before allowing the real canvas to mount', async () => {
        const loseContext = vi.fn();
        const context = { getExtension: vi.fn(() => ({ loseContext })) };
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(context as unknown as WebGL2RenderingContext);
        const { unavailable } = renderGate();

        await screen.findByText('3D canvas mounted');
        const probe = getContext.mock.contexts[0] as HTMLCanvasElement;
        expect(context.getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
        expect(loseContext).toHaveBeenCalledTimes(1);
        expect(probe?.width).toBe(0);
        expect(probe?.height).toBe(0);
        expect(unavailable).not.toHaveBeenCalled();
    });

    it('does not allocate a context after the renderer was switched away before probing', async () => {
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        const view = renderGate();
        view.unmount();
        await Promise.resolve();
        expect(getContext).not.toHaveBeenCalled();
    });
});
