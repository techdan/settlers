import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { claimAqueductResource } from '@/app/actions';

interface AqueductModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: '🌲',
    brick: '🧱',
    sheep: '🐑',
    wheat: '🌾',
    ore: '🪨'
};

export const AqueductModal: React.FC<AqueductModalProps> = ({ gameState, playerId }) => {
    const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const player = gameState.players.find(p => p.id === playerId);
    const playerResources = player?.resources || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    const handleClaim = async () => {
        if (!selectedResource || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await claimAqueductResource(gameState.roomId, playerId, selectedResource);
        } catch (e) {
            console.error('Failed to claim aqueduct resource', e);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center pt-8 pointer-events-none">
            <div className="bg-slate-900 p-6 rounded-xl border border-green-500 shadow-2xl max-w-md w-full pointer-events-auto h-fit">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Aqueduct Triggered! 💧</h2>
                <p className="text-slate-300 text-center mb-4">
                    You received no production this turn. Choose 1 resource from the bank.
                </p>

                <div className="mb-4 text-center text-sm text-slate-400">
                    Your current resources:
                </div>

                <div className="grid grid-cols-5 gap-2 mb-6">
                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => (
                        <button
                            key={res}
                            onClick={() => setSelectedResource(res)}
                            className={`
                                p-3 rounded-lg flex flex-col items-center gap-1 transition-all
                                ${selectedResource === res
                                    ? 'bg-green-600 ring-2 ring-green-400 scale-105'
                                    : 'bg-slate-800 hover:bg-slate-700'
                                }
                            `}
                        >
                            <span className="text-2xl">{RESOURCE_ICONS[res]}</span>
                            <span className="text-xs capitalize text-slate-300">{res}</span>
                            <span className="text-sm font-bold text-white">{playerResources[res]}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleClaim}
                    disabled={!selectedResource || isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                    {isSubmitting ? 'Claiming...' : 'Claim Resource'}
                </button>
            </div>
        </div>
    );
};
