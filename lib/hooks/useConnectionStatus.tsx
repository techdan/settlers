'use client';

import { useState, useEffect, useCallback } from 'react';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'error';

interface ConnectionStatusState {
    status: ConnectionStatus;
    lastError: Error | null;
    consecutiveFailures: number;
    lastSuccessTime: number | null;
}

/**
 * Connection Status Hook
 *
 * Tracks network connection state and provides retry logic with exponential backoff.
 *
 * Features:
 * - Detects online/offline status
 * - Exponential backoff retry (1s, 2s, 4s, 8s, max 30s)
 * - Tracks consecutive failures
 * - Auto-recovery when connection restored
 */
export function useConnectionStatus() {
    const [state, setState] = useState<ConnectionStatusState>({
        status: 'online',
        lastError: null,
        consecutiveFailures: 0,
        lastSuccessTime: null
    });

    // Listen to browser online/offline events
    useEffect(() => {
        const handleOnline = () => {
            setState(prev => ({
                ...prev,
                status: 'online',
                consecutiveFailures: 0,
                lastError: null
            }));
        };

        const handleOffline = () => {
            setState(prev => ({
                ...prev,
                status: 'offline'
            }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Mark request as successful
     */
    const markSuccess = useCallback(() => {
        setState({
            status: 'online',
            lastError: null,
            consecutiveFailures: 0,
            lastSuccessTime: Date.now()
        });
    }, []);

    /**
     * Mark request as failed
     */
    const markFailure = useCallback((error: Error) => {
        setState(prev => {
            const newFailures = prev.consecutiveFailures + 1;

            // After 3 failures, mark as reconnecting
            const newStatus: ConnectionStatus =
                newFailures >= 3 ? 'reconnecting' : 'error';

            return {
                status: newStatus,
                lastError: error,
                consecutiveFailures: newFailures,
                lastSuccessTime: prev.lastSuccessTime
            };
        });
    }, []);

    /**
     * Calculate retry delay using exponential backoff
     * 1st retry: 1s, 2nd: 2s, 3rd: 4s, 4th: 8s, 5th+: 30s
     */
    const getRetryDelay = useCallback((): number => {
        const failures = state.consecutiveFailures;
        if (failures === 0) return 0;

        // Exponential backoff: 2^(failures-1) seconds, max 30s
        const delay = Math.min(Math.pow(2, failures - 1) * 1000, 30000);
        return delay;
    }, [state.consecutiveFailures]);

    /**
     * Check if should retry
     */
    const shouldRetry = useCallback((): boolean => {
        // Don't retry if offline
        if (state.status === 'offline') return false;

        // Always retry if we've had failures
        return state.consecutiveFailures > 0;
    }, [state.status, state.consecutiveFailures]);

    return {
        status: state.status,
        isOnline: state.status === 'online',
        isOffline: state.status === 'offline',
        isReconnecting: state.status === 'reconnecting',
        hasError: state.status === 'error',
        lastError: state.lastError,
        consecutiveFailures: state.consecutiveFailures,
        lastSuccessTime: state.lastSuccessTime,
        markSuccess,
        markFailure,
        getRetryDelay,
        shouldRetry
    };
}

/**
 * Fetch with retry and exponential backoff
 *
 * @example
 * const { fetchWithRetry } = useFetchWithRetry(connectionStatus);
 *
 * const data = await fetchWithRetry('/api/game/ABC123', {
 *     maxRetries: 5
 * });
 */
export function useFetchWithRetry(connectionStatus: ReturnType<typeof useConnectionStatus>) {
    const fetchWithRetry = useCallback(async <T,>(
        url: string,
        options?: RequestInit,
        config?: {
            maxRetries?: number;
            onRetry?: (attempt: number, delay: number) => void;
        }
    ): Promise<T | null> => {
        const maxRetries = config?.maxRetries ?? 5;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // If offline, wait for online
                if (connectionStatus.isOffline) {
                    await new Promise(resolve => {
                        const checkOnline = () => {
                            if (navigator.onLine) {
                                window.removeEventListener('online', checkOnline);
                                resolve(undefined);
                            }
                        };
                        window.addEventListener('online', checkOnline);

                        // Also check periodically
                        const interval = setInterval(() => {
                            if (navigator.onLine) {
                                clearInterval(interval);
                                window.removeEventListener('online', checkOnline);
                                resolve(undefined);
                            }
                        }, 1000);
                    });
                }

                // Make request
                const response = await fetch(url, options);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Success
                connectionStatus.markSuccess();

                // Handle 304 Not Modified
                if (response.status === 304) {
                    return null;
                }

                const data = await response.json();
                return data as T;

            } catch (error) {
                lastError = error as Error;
                connectionStatus.markFailure(lastError);

                // If this is the last attempt, throw
                if (attempt === maxRetries) {
                    throw lastError;
                }

                // Calculate delay for next retry
                const delay = connectionStatus.getRetryDelay();

                // Notify caller of retry
                if (config?.onRetry) {
                    config.onRetry(attempt + 1, delay);
                }

                // Wait before retry
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError || new Error('Failed to fetch after retries');
    }, [connectionStatus]);

    return { fetchWithRetry };
}
