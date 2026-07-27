import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useConnectionStatus } from '../useConnectionStatus';

describe('useConnectionStatus', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('records a success time only after a successful request', () => {
        vi.useFakeTimers();
        vi.setSystemTime(42_000);

        const { result } = renderHook(() => useConnectionStatus());

        expect(result.current.lastSuccessTime).toBeNull();

        act(() => {
            result.current.markSuccess();
        });

        expect(result.current.lastSuccessTime).toBe(42_000);
        expect(result.current.status).toBe('online');
    });
});
