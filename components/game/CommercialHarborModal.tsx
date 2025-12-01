import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { CommodityType } from '@/core/rules/commodity-constants';

interface CommercialHarborModalProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
}

const COMMODITY_ICONS: Record<CommodityType, string> = {
    paper: '📜',
    cloth: '🧵',
    coin: '💰'
};

const COMMODITY_COLORS: Record<CommodityType, string> = {
    paper: 'bg-green-600 hover:bg-green-500',
    cloth: 'bg-yellow-600 hover:bg-yellow-500',
    coin: 'bg-amber-600 hover:bg-amber-500'
};

export const CommercialHarborModal: React.FC<CommercialHarborModalProps> = ({
    gameState,
    playerId,
    roomId
}) => {
    const [selectedCommodity, setSelectedCommodity] = useState<CommodityType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const harbor = gameState.pendingCommercialHarbor;
    if (!harbor || !harbor.offers) return null;

    // Find this player's offer
    const myOffer = harbor.offers.find(o => o.targetPlayerId === playerId);
    if (!myOffer || myOffer.offeredResource === null || myOffer.response !== undefined) return null;

    const player = gameState.players.find(p => p.id === playerId);
    const initiator = gameState.players.find(p => p.id === harbor.initiatorId);

    if (!player || !initiator) return null;

    const offeredResource = myOffer.offeredResource;

    // Get available commodities
    const availableCommodities: CommodityType[] = [];
    if (player.commodities) {
        (['paper', 'cloth', 'coin'] as CommodityType[]).forEach(commodity => {
            if ((player.commodities?.[commodity] ?? 0) > 0) {
                availableCommodities.push(commodity);
            }
        });
    }

    const hasNoCommodities = availableCommodities.length === 0;

    // Auto-select if only one option
    if (availableCommodities.length === 1 && !selectedCommodity) {
        setSelectedCommodity(availableCommodities[0]);
    }

    const handleSubmit = async () => {
        if (!hasNoCommodities && !selectedCommodity) {
            setError('Please select a commodity');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/game/${roomId}/commercial-harbor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    action: 'respond',
                    commodity: hasNoCommodities ? null : selectedCommodity
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to respond to Commercial Harbor');
            }

            // Success - modal will close automatically when gameState updates
        } catch (e: any) {
            setError(e.message || 'Failed to submit response');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-900 border border-yellow-500/60 rounded-xl shadow-2xl p-6 w-[420px] text-white">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="text-sm uppercase tracking-wide text-yellow-300 mb-2">
                        Commercial Harbor Offer
                    </div>
                    <div className="text-xl font-bold text-yellow-100">
                        {initiator.name} is offering {offeredResource}
                    </div>
                </div>

                {/* Description */}
                {hasNoCommodities ? (
                    <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4 mb-4">
                        <p className="text-sm text-orange-200 text-center">
                            You have <span className="font-semibold">no commodities</span> to trade.{' '}
                            The {offeredResource} will be returned to {initiator.name}.
                        </p>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-slate-200 text-center">
                            Give <span className="font-semibold">1 commodity</span> in exchange for{' '}
                            <span className="font-semibold">1 {offeredResource}</span>.
                        </p>
                    </div>
                )}

                {/* Commodity Selection */}
                {!hasNoCommodities && (
                    <div className="space-y-3 mb-4">
                        <label className="text-sm font-medium block text-slate-300">
                            Select a commodity to give:
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['paper', 'cloth', 'coin'] as CommodityType[]).map(commodity => {
                                const available = player.commodities?.[commodity] ?? 0;
                                const isDisabled = available <= 0;
                                const isSelected = selectedCommodity === commodity;

                                return (
                                    <button
                                        key={commodity}
                                        onClick={() => !isDisabled && setSelectedCommodity(commodity)}
                                        disabled={isDisabled || isSubmitting}
                                        className={`relative p-4 rounded-lg border-2 transition-all ${
                                            isSelected
                                                ? 'border-yellow-400 bg-yellow-900/30 ring-2 ring-yellow-400/50'
                                                : isDisabled
                                                ? 'border-slate-700 bg-slate-800/30 opacity-40 cursor-not-allowed'
                                                : 'border-slate-600 hover:border-slate-500 cursor-pointer'
                                        }`}
                                    >
                                        <div className="text-3xl mb-1">{COMMODITY_ICONS[commodity]}</div>
                                        <div className="text-xs font-semibold capitalize mb-1">{commodity}</div>
                                        <div className="text-xs text-slate-400">
                                            {available} available
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1">
                                                <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                                                    <span className="text-xs text-slate-900">✓</span>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={(!hasNoCommodities && !selectedCommodity) || isSubmitting}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        (!hasNoCommodities && !selectedCommodity) || isSubmitting
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : hasNoCommodities
                            ? 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                            : 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer'
                    }`}
                >
                    {isSubmitting ? 'Submitting...' : hasNoCommodities ? 'Return Resource' : 'Confirm Trade'}
                </button>
            </div>
        </div>
    );
};
