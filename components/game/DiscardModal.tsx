import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/lib/board-data';
import { discardCards } from '@/app/actions';

interface DiscardModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_ORDER: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const INITIAL_SELECTION: Record<ResourceType, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

function selectionsEqual(a: Record<ResourceType, number>, b: Record<ResourceType, number>): boolean {
    return RESOURCE_ORDER.every(res => a[res] === b[res]);
}

function normalizeResources(resources?: Record<ResourceType, number>): Record<ResourceType, number> {
    return RESOURCE_ORDER.reduce((acc, res) => {
        const value = resources?.[res];
        acc[res] = Number.isFinite(value) ? Math.max(0, value as number) : 0;
        return acc;
    }, { ...INITIAL_SELECTION });
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: 'wood',
    brick: 'brick',
    sheep: 'sheep',
    wheat: 'wheat',
    ore: 'ore'
};

export const DiscardModal: React.FC<DiscardModalProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [selected, setSelected] = useState<Record<ResourceType, number>>(INITIAL_SELECTION);
    const [isPending, startTransition] = useTransition();

    const safeResources = React.useMemo(
        () => normalizeResources(player?.resources),
        [
            player?.resources?.wood,
            player?.resources?.brick,
            player?.resources?.sheep,
            player?.resources?.wheat,
            player?.resources?.ore,
            player?.id
        ]
    );

    const totalResources = React.useMemo(
        () => RESOURCE_ORDER.reduce((sum, res) => sum + safeResources[res], 0),
        [safeResources]
    );
    const requiredDiscard = player ? Math.max(0, Math.floor(totalResources / 2)) : 0;

    // Reset/clamp selection whenever discard phase changes or resources update to avoid stale/negative counts.
    React.useEffect(() => {
        if (!player) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        if (gameState.phase !== 'discarding' || player.discardedThisTurn) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        setSelected(prev => {
            let next = { ...prev };
            let changed = false;

            // Clamp to available resources
            RESOURCE_ORDER.forEach(res => {
                const max = safeResources[res];
                if (next[res] > max) {
                    next[res] = max;
                    changed = true;
                }
                if (next[res] < 0) {
                    next[res] = 0;
                    changed = true;
                }
            });

            // Prevent selecting more than required discard after clamping
            const totalSelected = RESOURCE_ORDER.reduce((sum, res) => sum + next[res], 0);
            if (requiredDiscard > 0 && totalSelected > requiredDiscard) {
                let excess = totalSelected - requiredDiscard;
                for (const res of RESOURCE_ORDER) {
                    if (excess === 0) break;
                    const reducible = Math.min(next[res], excess);
                    if (reducible > 0) {
                        next[res] -= reducible;
                        excess -= reducible;
                        changed = true;
                    }
                }
            }

            return changed ? next : prev;
        });
    }, [
        gameState.phase,
        player?.id,
        player?.discardedThisTurn,
        safeResources.wood,
        safeResources.brick,
        safeResources.sheep,
        safeResources.wheat,
        safeResources.ore,
        requiredDiscard
    ]);

    if (!player || gameState.phase !== 'discarding') return null;

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

    const currentSelected = RESOURCE_ORDER.reduce((sum, res) => sum + selected[res], 0);

    const handleIncrement = (res: ResourceType) => {
        const max = safeResources[res];
        if (selected[res] < max && currentSelected < requiredDiscard) {
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
                <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">Robber Attack!</h2>
                <p className="text-slate-300 text-center mb-6">
                    You have {totalResources} cards. You must discard <span className="font-bold text-white">{requiredDiscard}</span> cards.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {(RESOURCE_ORDER as ResourceType[]).map(res => {
                        const max = safeResources[res];
                        if (max === 0) return null;

                        return (
                            <div key={res} className="bg-slate-800 p-3 rounded-lg flex flex-col items-center border border-slate-700">
                                <div className="text-2xl mb-1">{RESOURCE_ICONS[res]}</div>
                                <div className="text-xs text-slate-300 uppercase mb-2">{res}</div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDecrement(res)}
                                        disabled={selected[res] === 0}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-white"
                                    >-</button>
                                    <span className="font-bold w-4 text-center text-white">{selected[res]}</span>
                                    <button
                                        onClick={() => handleIncrement(res)}
                                        disabled={selected[res] === max || currentSelected >= requiredDiscard}
                                        className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center font-bold text-white"
                                    >+</button>
                                </div>
                                <div className={`text-xs mt-1 font-semibold ${selected[res] > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                    Have: {max - selected[res]}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="text-lg font-bold text-white">
                        Selected: <span className={currentSelected === requiredDiscard ? "text-green-400" : "text-yellow-400"}>
                            {currentSelected}
                        </span> / {requiredDiscard}
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={currentSelected !== requiredDiscard || isPending}
                        className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        {isPending ? 'Discarding...' : 'Confirm Discard'}
                    </button>
                </div>
            </div>
        </div>
    );
};
