import React, { useMemo, useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { GuildSelectionList, SelectionMap, getSelectionCount } from './GuildSelectionList';

interface WeddingGiftModalProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
}

export const WeddingGiftModal: React.FC<WeddingGiftModalProps> = ({ gameState, playerId, roomId }) => {
    const wedding = gameState.pendingWedding;
    if (!wedding) return null;

    const request = wedding.requests.find(r => r.playerId === playerId && r.status === 'pending');
    if (!request || request.requiredCards <= 0) return null;

    const initiator = gameState.players.find(p => p.id === wedding.initiatorId);
    const player = gameState.players.find(p => p.id === playerId);

    if (!initiator || !player) return null;

    const [selections, setSelections] = useState<SelectionMap>({});
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableItems = useMemo(() => {
        const entries: { type: 'resource' | 'commodity'; value: ResourceType | CommodityType; available: number }[] = [];
        Object.entries(player.resources || {}).forEach(([res, count]) => {
            if ((count || 0) > 0) {
                entries.push({ type: 'resource', value: res as ResourceType, available: count || 0 });
            }
        });
        Object.entries(player.commodities || {}).forEach(([com, count]) => {
            if ((count || 0) > 0) {
                entries.push({ type: 'commodity', value: com as CommodityType, available: count || 0 });
            }
        });
        return entries;
    }, [player]);

    const required = request.requiredCards;
    const selectedCount = getSelectionCount(selections);

    const handleSubmit = async () => {
        if (selectedCount !== required) {
            setError(required === 1 ? 'Select 1 card to give.' : `Select ${required} cards to give.`);
            return;
        }

        const payload = Object.entries(selections).flatMap(([key, count]) => {
            const [type, value] = key.split(':');
            return Array.from({ length: count }, () => ({ type, value }));
        });

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/game/${roomId}/progress-card/wedding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    selections: payload
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to submit cards');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to submit cards');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-900 border border-blue-500/60 rounded-xl shadow-2xl p-6 w-[520px] text-white">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-blue-300 mb-1">Wedding</div>
                        <h3 className="text-xl font-bold text-white">
                            Give {required} card{required === 1 ? '' : 's'} to {initiator.name}
                        </h3>
                        <p className="text-sm text-slate-300">
                            You currently have more victory points than {initiator.name}. Choose which cards to hand over.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-sm text-slate-200">
                        Select {required} resource or commodity card{required === 1 ? '' : 's'} to give.
                    </div>

                    <GuildSelectionList
                        items={availableItems}
                        required={required}
                        selections={selections}
                        onChange={(next) => {
                            setSelections(next);
                            setError('');
                        }}
                        emptyMessage="You have no resources or commodities to give."
                        summaryPrefix="You selected"
                    />

                    {error && (
                        <div className="mt-2 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedCount !== required}
                        className={`px-4 py-2 rounded font-medium transition-colors ${
                            isSubmitting || selectedCount !== required
                                ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-70'
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Give Cards'}
                    </button>
                </div>
            </div>
        </div>
    );
};
