import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { CommodityType } from '@/core/rules/commodity-constants';
import { respondToCommercialHarbor } from '@/app/actions';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '@/components/game/ui/TabletopModal';

interface CommercialHarborModalProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
}

const COMMODITY_TYPES: CommodityType[] = ['paper', 'cloth', 'coin'];

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

    const effectiveSelectedCommodity = selectedCommodity ?? (availableCommodities.length === 1 ? availableCommodities[0] : null);

    const handleSubmit = async () => {
        if (!hasNoCommodities && !effectiveSelectedCommodity) {
            setError('Please select a commodity');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await respondToCommercialHarbor(roomId, playerId, hasNoCommodities ? null : effectiveSelectedCommodity);

            // Success - modal will close automatically when gameState updates
        } catch (e: any) {
            setError(e.message || 'Failed to submit response');
            setIsSubmitting(false);
        }
    };

    return (
        <TabletopModal
            title={<span className="flex items-center gap-2"><TabletopStatusIcon type="trade" size={22} /> Commercial Harbor Offer</span>}
            description={<span className="flex items-center gap-1.5">{initiator.name} is offering <TabletopResourceIcon type={offeredResource} size={20} label={offeredResource} /> <span className="capitalize">{offeredResource}</span></span>}
            footer={(
                <TabletopButton
                    variant={hasNoCommodities ? 'secondary' : 'primary'}
                    onClick={handleSubmit}
                    disabled={(!hasNoCommodities && !effectiveSelectedCommodity) || isSubmitting}
                    className="w-full"
                >
                    {isSubmitting ? 'Submitting...' : hasNoCommodities ? 'Return Resource' : 'Confirm Trade'}
                </TabletopButton>
            )}
        >
                {/* Description */}
                {hasNoCommodities ? (
                    <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4 mb-4">
                        <p className="text-sm text-orange-200 text-center">
                            You have <span className="font-semibold">no commodities</span> to trade.{' '}
                            The {offeredResource} will be returned to {initiator.name}.
                        </p>
                    </div>
                ) : (
                    <div className="mb-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                        <p className="text-center text-sm text-[var(--ui-text)]">
                            Give <span className="font-semibold">1 commodity</span> in exchange for{' '}
                            <span className="font-semibold">1 {offeredResource}</span>.
                        </p>
                    </div>
                )}

                {/* Commodity Selection */}
                {!hasNoCommodities && (
                    <div className="space-y-3 mb-4">
                        <label className="block text-sm font-medium text-[var(--ui-muted)]">
                            Select a commodity to give:
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {COMMODITY_TYPES.map(commodity => {
                                const available = player.commodities?.[commodity] ?? 0;
                                const isDisabled = available <= 0;
                                const isSelected = effectiveSelectedCommodity === commodity;

                                return (
                                    <button
                                        key={commodity}
                                        onClick={() => !isDisabled && setSelectedCommodity(commodity)}
                                        disabled={isDisabled || isSubmitting}
                                        aria-pressed={isSelected}
                                        className={`relative rounded-lg border-2 p-4 transition-all ${tabletopOptionClass(isSelected, isDisabled || isSubmitting)}`}
                                    >
                                        <TabletopCommodityIcon type={commodity} size={36} label={commodity} className="mx-auto mb-1" />
                                        <div className="text-xs font-semibold capitalize mb-1">{commodity}</div>
                                        <div className="text-xs text-[var(--ui-muted)]">
                                            {available} available
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ui-panel-solid)]">
                                                    <TabletopStatusIcon type="confirm" size={15} />
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

        </TabletopModal>
    );
};
