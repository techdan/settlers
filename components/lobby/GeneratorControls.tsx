'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { generateLobbyBoard, requestNewLobbyBoard, toggleLobbyFairMode } from '@/app/actions';
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert, Users } from 'lucide-react';

interface Player {
    id: string;
    name: string;
}

interface GeneratorControlsProps {
    roomId: string;
    hostId: string;
    currentPlayerId: string;
    isHost: boolean;
    fairMode: boolean;
    pendingRequests: string[];
    players: Player[];
}

export function GeneratorControls({
    roomId,
    hostId,
    currentPlayerId,
    isHost,
    fairMode,
    pendingRequests,
    players
}: GeneratorControlsProps) {
    const [isPending, startTransition] = useTransition();
    const [optimisticFairMode, setOptimisticFairMode] = useState(fairMode);

    useEffect(() => {
        setOptimisticFairMode(fairMode);
    }, [fairMode]);

    // Derive request state from props
    const hasRequested = pendingRequests.includes(currentPlayerId);

    // Get names of players who requested
    const requestingPlayerNames = pendingRequests
        .map(id => players.find(p => p.id === id)?.name)
        .filter(Boolean) as string[];

    const handleGenerate = () => {
        startTransition(async () => {
            await generateLobbyBoard(roomId, hostId, optimisticFairMode);
        });
    };

    const handleToggleFairness = () => {
        const nextFairMode = !optimisticFairMode;
        setOptimisticFairMode(nextFairMode);

        startTransition(async () => {
            try {
                await toggleLobbyFairMode(roomId, hostId, nextFairMode);
            } catch (error) {
                setOptimisticFairMode(optimisticFairMode);
                console.error('Failed to toggle fairness mode', error);
            }
        });
    };

    const handleRequest = () => {
        startTransition(async () => {
            await requestNewLobbyBoard(roomId, currentPlayerId);
        });
    };

    if (isHost) {
        return (
            <div className="flex flex-col gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg backdrop-blur-sm bg-opacity-90">
                {requestingPlayerNames.length > 0 && (
                    <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-medium w-fit mx-auto animate-pulse">
                        <Users size={14} />
                        <span>
                            {requestingPlayerNames.slice(0, 3).join(', ')}
                            {requestingPlayerNames.length > 3 && ` +${requestingPlayerNames.length - 3} others`}
                            {' '}request{requestingPlayerNames.length === 1 ? 's' : ''} a new board
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg font-medium btn-interactive disabled:cursor-not-allowed"
                    >
                        {isPending ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        Generate New Board
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => startTransition(async () => {
                                const { setLobbyStandardBoard } = await import('@/app/actions');
                                await setLobbyStandardBoard(roomId, hostId);
                            })}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-all shadow-sm hover:shadow text-xs font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ShieldCheck size={14} className="text-slate-500" />
                            Use Beginner Board
                        </button>

                        <label className={`flex-1 flex items-center justify-center gap-2 group p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 ${isPending ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={optimisticFairMode}
                                onChange={handleToggleFairness}
                                disabled={isPending}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="text-xs font-medium text-slate-700 select-none">Enable Fairness</span>
                        </label>
                    </div>

                    {optimisticFairMode && (
                        <div className="text-[14px] text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 leading-tight">
                            <span className="font-semibold">Fairness Rules:</span> No 3+ terrain clusters. No {'>'}11 pip intersections.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-lg">Board Settings</h3>

            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                {fairMode ? <ShieldCheck size={16} className="text-emerald-600" /> : <ShieldAlert size={16} className="text-slate-400" />}
                <span>Fairness Mode is {fairMode ? 'Enabled' : 'Disabled'}</span>
            </div>

            <button
                onClick={handleRequest}
                disabled={isPending || hasRequested}
                className="flex cursor-pointer items-center justify-center gap-2 w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                {hasRequested ? 'Request Sent' : 'Request New Board'}
            </button>
            {hasRequested && (
                <p className="text-xs text-slate-500 text-center">
                    Host has been notified.
                </p>
            )}
        </div>
    );
}
