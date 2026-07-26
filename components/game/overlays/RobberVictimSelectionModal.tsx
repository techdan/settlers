'use client';

import React from 'react';
import { GameState } from '@/lib/types';
import { getTotalResources } from '@/core/engine/resources/resource-manager';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '../ui/TabletopModal';

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
        <TabletopModal
            title="Choose a Player to Rob"
            description="Select which player you want to steal a resource card from."
            onClose={onCancel}
            footer={<TabletopButton onClick={onCancel}>Cancel</TabletopButton>}
        >

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
                                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${tabletopOptionClass(false, !hasResources)}`}
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
                                        <span className="font-semibold text-[var(--ui-text)]">
                                            {victim.name}
                                        </span>
                                    </div>
                                    <div className="text-[var(--ui-muted)]">
                                        {hasResources ? (
                                            <span>{totalResources} card{totalResources !== 1 ? 's' : ''}</span>
                                        ) : (
                                            <span className="text-[var(--ui-muted)]">No cards</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {victims.every(v => v && getTotalResources(v) === 0) && (
                    <div className="mb-4">
                        <TabletopButton
                            onClick={() => onSelectVictim(null)}
                            className="w-full"
                        >
                            Continue (No one to rob)
                        </TabletopButton>
                    </div>
                )}

        </TabletopModal>
    );
};
