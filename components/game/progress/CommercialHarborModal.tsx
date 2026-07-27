import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { CommodityType } from '@/core/rules/commodity-constants';
import { respondToCommercialHarbor } from '@/app/actions';
import { TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { CARD_LABELS, CardTokenGroup } from '@/components/game/ui/CardToken';

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
        } catch (error: unknown) {
            setError(
                error instanceof Error && error.message
                    ? error.message
                    : 'Failed to submit response'
            );
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
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] p-4">
                        <TabletopStatusIcon type="warning" size={16} className="mt-0.5 shrink-0" />
                        <p className="text-sm text-[var(--ui-text)]">
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
                    <div className="mb-4 space-y-3">
                        <p className="text-sm font-medium text-[var(--ui-muted)]">
                            Select a commodity to give:
                        </p>
                        <CardTokenGroup
                            label="Commodity to give"
                            items={COMMODITY_TYPES.map(commodity => {
                                const available = player.commodities?.[commodity] ?? 0;
                                return {
                                    type: commodity,
                                    count: available,
                                    disabled: available <= 0 || isSubmitting,
                                    disabledReason: available <= 0
                                        ? `You have no ${CARD_LABELS[commodity]}`
                                        : 'Submitting your response…',
                                    ariaLabel: `Give ${CARD_LABELS[commodity]}, you have ${available}`,
                                };
                            })}
                            selected={effectiveSelectedCommodity}
                            onSelect={type => { setSelectedCommodity(type as CommodityType); setError(''); }}
                        />
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2"
                    >
                        <TabletopStatusIcon type="cancel" size={16} className="mt-0.5 shrink-0" />
                        <span className="text-sm text-[var(--ui-text)]">{error}</span>
                    </div>
                )}

        </TabletopModal>
    );
};
