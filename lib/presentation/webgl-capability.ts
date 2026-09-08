export type WebGL2Capability =
    | { supported: true }
    | { supported: false; error: Error };

/**
 * Fiber configures its renderer asynchronously, outside React error boundaries.
 * Probe before mounting Canvas so unsupported devices take the normal fallback.
 * The temporary drawing buffer is tiny and its context is released immediately.
 */
export function probeWebGL2(): WebGL2Capability {
    let canvas: HTMLCanvasElement | undefined;
    let context: WebGL2RenderingContext | null = null;
    try {
        canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        context = canvas.getContext('webgl2', { powerPreference: 'low-power' });
        return context
            ? { supported: true }
            : { supported: false, error: new Error('WebGL2 is unavailable on this device.') };
    } catch {
        return { supported: false, error: new Error('The graphics context could not be initialized.') };
    } finally {
        try {
            context?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
            // Some drivers reject extension calls after losing a context.
        }
        if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
        }
    }
}
