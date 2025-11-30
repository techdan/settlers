'use client';

import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';

type PromptEntry = {
    pending: boolean;
    forceHide: boolean;
    status?: string;
};

type PromptState = Record<string, PromptEntry>;

type PromptActions = {
    begin: (cardType: string, status?: string) => void;
    complete: (cardType: string) => void;
    forceHide: (cardType: string) => void;
    reset: (cardType: string) => void;
    setStatus: (cardType: string, status?: string) => void;
    getEntry: (cardType: string) => PromptEntry | undefined;
};

const ProgressPromptContext = createContext<PromptActions | null>(null);

const getDefaultEntry = (): PromptEntry => ({ pending: false, forceHide: false, status: undefined });

export const ProgressPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<PromptState>({});

    const begin = useCallback((cardType: string, status?: string) => {
        setState(prev => ({
            ...prev,
            [cardType]: {
                pending: true,
                forceHide: false,
                status: status ?? prev[cardType]?.status
            }
        }));
    }, []);

    const complete = useCallback((cardType: string) => {
        setState(prev => ({
            ...prev,
            [cardType]: {
                pending: false,
                forceHide: false,
                status: prev[cardType]?.status
            }
        }));
    }, []);

    const forceHide = useCallback((cardType: string) => {
        setState(prev => ({
            ...prev,
            [cardType]: {
                pending: false,
                forceHide: true,
                status: prev[cardType]?.status
            }
        }));
    }, []);

    const reset = useCallback((cardType: string) => {
        setState(prev => ({
            ...prev,
            [cardType]: getDefaultEntry()
        }));
    }, []);

    const setStatus = useCallback((cardType: string, status?: string) => {
        setState(prev => ({
            ...prev,
            [cardType]: {
                ...getDefaultEntry(),
                ...prev[cardType],
                status
            }
        }));
    }, []);

    const getEntry = useCallback(
        (cardType: string) => state[cardType],
        [state]
    );

    const value = useMemo(
        () => ({
            begin,
            complete,
            forceHide,
            reset,
            setStatus,
            getEntry
        }),
        [begin, complete, forceHide, reset, setStatus, getEntry]
    );

    return <ProgressPromptContext.Provider value={value}>{children}</ProgressPromptContext.Provider>;
};

type UseProgressPromptResult = {
    isVisible: boolean;
    status?: string;
    begin: (status?: string) => void;
    hide: () => void;
    clear: () => void;
    setStatus: (status?: string) => void;
};

/**
 * useProgressPrompt - shared optimistic prompt manager
 * @param cardType progress card identifier
 * @param externalActive whether the server/game state reports the card is active
 */
export function useProgressPrompt(cardType: string, externalActive = false): UseProgressPromptResult {
    const ctx = useContext(ProgressPromptContext);
    if (!ctx) {
        throw new Error('useProgressPrompt must be used within a ProgressPromptProvider');
    }

    const entry = ctx.getEntry(cardType) ?? getDefaultEntry();
    const isVisible = !entry.forceHide && (externalActive || entry.pending);

    useEffect(() => {
        if (externalActive && entry.pending) {
            ctx.complete(cardType);
        }
    }, [cardType, ctx, externalActive, entry.pending]);

    return {
        isVisible,
        status: entry.status,
        begin: (status?: string) => ctx.begin(cardType, status),
        hide: () => ctx.forceHide(cardType),
        clear: () => ctx.reset(cardType),
        setStatus: (status?: string) => ctx.setStatus(cardType, status)
    };
}
