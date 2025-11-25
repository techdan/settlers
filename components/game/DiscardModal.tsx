import React, { useState, useTransition } from 'react';
import { GameState, PlayerState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { discardCards } from '@/app/actions';

interface DiscardModalProps {
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

export const DiscardModal: React.FC<DiscardModalProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [selected, setSelected] = useState<Record<ResourceType, number>>({
        wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0
    });
    const [isPending, startTransition] = useTransition();

    if (!player || gameState.phase !== 'discarding') return null;

    const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
    if (totalResources <= 7 || player.discardedThisTurn) {
        // Show waiting message if others are discarding
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Waiting for Discards</h2>
                    <p className="text-slate-300">
                        Waiting for other players to discard half their cards...
                    </p>
                </div>
            </div>
        );
    }

    const requiredDiscard = Math.floor(totalResources / 2);
    const currentSelected = Object.values(selected).reduce((a, b) => a + b, 0);

    const handleIncrement = (res: ResourceType) => {
        if (selected[res] < player.resources[res] && currentSelected < requiredDiscard) {
            setSelected(prev => ({ ...prev, [res]: prev[res] + 1 }));
        }
    };

    const handleDecrement = (res: ResourceType) => {
        if (selected[res] > 0) {
            setSelected(prev => ({ ...prev, [res]: prev[res] - 1 }));
        }
    };

    const handleConfirm = () => {
        if (currentSelected !== requiredDiscard) return;

        startTransition(async () => {
            try {
                await discardCards(gameState.roomId, playerId, selected);
            } catch (e) {
                console.error("Failed to discard", e);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-xl border border-red-500/50 shadow-2xl max-w-lg w-full">
                <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">Robber Attack! 🏴‍☠️</h2>
                <p className="text-slate-300 text-center mb-6">
                    You have {totalResources} cards. You must discard <span className="font-bold text-white">{requiredDiscard}</span> cards.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => {
                        const max = player.resources[res] || 0;
                        if (max === 0) return null;

                        return (
                            <div key={res} className="bg-slate-800 p-3 rounded-lg flex flex-col items-center border border-slate-700">
                                <div className="text-2xl mb-1">{RESOURCE_ICONS[res]}</div>
                                <div className="text-xs text-slate-400 uppercase mb-2">{res}</div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDecrement(res)}
                                        disabled={selected[res] === 0}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold"
                                    >-</button>
                                    <span className="font-bold w-4 text-center">{selected[res]}</span>
                                    <button
                                        onClick={() => handleIncrement(res)}
                                        disabled={selected[res] === max || currentSelected >= requiredDiscard}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold"
                                    >+</button>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">Have: {max}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="text-lg font-bold">
                        Selected: <span className={currentSelected === requiredDiscard ? "text-green-400" : "text-yellow-400"}>
                            {currentSelected}
                        </span> / {requiredDiscard}
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={currentSelected !== requiredDiscard || isPending}
                        className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        {isPending ? 'Discarding...' : 'Confirm Discard 🗑️'}
                    </button>
                </div>
            </div>
        </div>
    );
};
