'use client';

import React from 'react';
import { GameState } from '@/lib/types';
import { getTotalResources } from '@/core/engine/resources/resource-manager';

interface RobberVictimSelectionModalProps {
    isOpen: boolean;
    gameState: GameState;
    potentialVictims: string[]; // Array of player IDs
    onSelectVictim: (victimId: string | null) => void;
    onCancel: () => void;
}

export const RobberVictimSelectionModal: React.FC<RobberVictimSelectionModalProps> = ({
    isOpen,
    gameState,
    potentialVictims,
    onSelectVictim,
    onCancel
}) => {
    if (!isOpen) return null;

    const victims = potentialVictims
        .map(id => gameState.players.find(p => p.id === id))
        .filter(p => p !== undefined);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
                className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-md w-full mx-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="victim-selection-title"
            >
                <h2 id="victim-selection-title" className="text-xl font-bold text-white mb-4">
                    Choose a Player to Rob
                </h2>

                <p className="text-slate-300 mb-6">
                    Select which player you want to steal a resource card from:
                </p>

                <div className="space-y-3 mb-6">
                    {victims.map(victim => {
                        if (!victim) return null;
                        const totalResources = getTotalResources(victim);
                        const hasResources = totalResources > 0;

                        return (
                            <button
                                key={victim.id}
                                onClick={() => onSelectVictim(victim.id)}
                                disabled={!hasResources}
                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                    hasResources
                                        ? 'border-slate-500 hover:border-slate-400 hover:bg-slate-700 cursor-pointer'
                                        : 'border-slate-700 bg-slate-900 cursor-not-allowed opacity-50'
                                }`}
                                style={{
                                    borderColor: hasResources ? victim.color : undefined
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-white"
                                            style={{ backgroundColor: victim.color }}
                                        />
                                        <span className="text-white font-semibold">
                                            {victim.name}
                                        </span>
                                    </div>
                                    <div className="text-slate-300">
                                        {hasResources ? (
                                            <span>{totalResources} card{totalResources !== 1 ? 's' : ''}</span>
                                        ) : (
                                            <span className="text-slate-500">No cards</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {victims.every(v => v && getTotalResources(v) === 0) && (
                    <div className="mb-4">
                        <button
                            onClick={() => onSelectVictim(null)}
                            className="w-full p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
                        >
                            Continue (No one to rob)
                        </button>
                    </div>
                )}

                <button
                    onClick={onCancel}
                    className="w-full p-3 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
