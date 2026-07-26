import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { playProgressCard, makeCommercialHarborOffers, cancelCommercialHarbor } from '@/app/actions';
import { TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '@/components/game/ui/TabletopModal';

interface CommercialHarborInitiatorDialogProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
    onClose?: () => void;
}

const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

export const CommercialHarborInitiatorDialog: React.FC<CommercialHarborInitiatorDialogProps> = ({
    gameState,
    playerId,
    roomId,
    onClose
}) => {
    const harbor = gameState.pendingCommercialHarbor;

    // If no pending harbor, this was just opened from clicking the card
    // Show selection dialog
    if (!harbor) {
        return <OfferSelectionDialog gameState={gameState} playerId={playerId} roomId={roomId} isInitialPlay={true} onClose={onClose} />;
    }

    // Harbor exists - check if it's ours
    if (harbor.initiatorId !== playerId) return null;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    // If offers haven't been made yet, show the selection UI
    if (!harbor.offers || harbor.offers.length === 0) {
        return <OfferSelectionDialog gameState={gameState} playerId={playerId} roomId={roomId} isInitialPlay={false} />;
    }

    // Once offers are made, don't block the player - they can continue their turn
    // Only show a non-blocking status notification
    return null;
};

// Component for selecting offers
const OfferSelectionDialog: React.FC<{
    gameState: GameState;
    playerId: string;
    roomId: string;
    isInitialPlay: boolean;
    onClose?: () => void;
}> = ({ gameState, playerId, roomId, isInitialPlay, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId)!;
    const opponents = gameState.players.filter(p => p.id !== playerId);

    const [selectedResources, setSelectedResources] = useState<Record<string, ResourceType | null>>(
        Object.fromEntries(opponents.map(o => [o.id, null]))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const handleResourceChange = (opponentId: string, resource: ResourceType | null) => {
        setSelectedResources(prev => ({ ...prev, [opponentId]: resource }));
    };

    const handleSubmit = async () => {
        // Build offers array
        const offers = opponents.map(opp => ({
            targetPlayerId: opp.id,
            offeredResource: selectedResources[opp.id]
        }));

        // Validate we have at least one trade
        if (!offers.some(o => o.offeredResource !== null)) {
            setError('Please select at least one trade');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // If this is initial play, we need to play the card first
            if (isInitialPlay) {
                await playProgressCard(roomId, playerId, 'commercial_harbor');
            }

            // Now make the offers
            await makeCommercialHarborOffers(roomId, playerId, offers);

            // Success - close the modal so player can continue their turn
            onClose?.();
        } catch (e: any) {
            setError(e.message || 'Failed to make offers');
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        // If this is initial play (card hasn't been played yet), just close the modal
        if (isInitialPlay) {
            onClose?.();
            return;
        }

        // Otherwise, cancel the already-started Commercial Harbor
        setIsSubmitting(true);
        setError('');

        try {
            await cancelCommercialHarbor(roomId, playerId);

            // Success - modal will close
        } catch (e: any) {
            setError(e.message || 'Failed to cancel');
            setIsSubmitting(false);
        }
    };

    // Calculate resource totals needed
    const resourcesNeeded: Record<ResourceType, number> = {
        wood: 0,
        brick: 0,
        wheat: 0,
        sheep: 0,
        ore: 0
    };

    Object.values(selectedResources).forEach(resource => {
        if (resource) {
            resourcesNeeded[resource]++;
        }
    });

    return (
        <TabletopModal
            title={<span className="flex items-center gap-2"><TabletopStatusIcon type="trade" size={22} /> Commercial Harbor</span>}
            description='Select which resource to offer each player (or select "No Trade").'
            onClose={isSubmitting ? undefined : handleCancel}
            width="lg"
            footer={(
                <>
                    <TabletopButton variant="danger" onClick={handleCancel} disabled={isSubmitting}>Cancel</TabletopButton>
                    <TabletopButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Making Offers...' : 'Make Offers'}
                    </TabletopButton>
                </>
            )}
        >
                {/* Player List with Dropdowns */}
                <div className="space-y-2 mb-4">
                    {opponents.map(opponent => {
                        const hasCommodities = opponent.commodities &&
                            (opponent.commodities.paper > 0 || opponent.commodities.cloth > 0 || opponent.commodities.coin > 0);

                        return (
                            <div key={opponent.id} className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-3">
                                {/* Player Name */}
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="font-semibold">{opponent.name}</div>
                                    <div className="flex items-center gap-1 text-xs text-[var(--ui-muted)]">
                                        <TabletopStatusIcon type={hasCommodities ? 'confirm' : 'cancel'} size={14} />
                                        {hasCommodities ? 'Has commodities' : 'No commodities'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleResourceChange(opponent.id, null)}
                                        disabled={isSubmitting || !hasCommodities}
                                        className={`rounded-lg border px-2 py-2 text-xs ${tabletopOptionClass(selectedResources[opponent.id] === null, isSubmitting || !hasCommodities)}`}
                                    >
                                        No Trade
                                    </button>
                                    {RESOURCE_TYPES.map(resource => {
                                        const needed = resourcesNeeded[resource];
                                        const available = player.resources[resource] || 0;
                                        const remaining = available - needed;
                                        const disabled = isSubmitting || !hasCommodities || (remaining <= 0 && selectedResources[opponent.id] !== resource);

                                        return (
                                            <button
                                                type="button"
                                                key={resource}
                                                onClick={() => handleResourceChange(opponent.id, resource)}
                                                disabled={disabled}
                                                aria-pressed={selectedResources[opponent.id] === resource}
                                                className={`flex flex-col items-center rounded-lg border p-2 text-xs capitalize ${tabletopOptionClass(selectedResources[opponent.id] === resource, disabled)}`}
                                            >
                                                <TabletopResourceIcon type={resource} size={24} label={resource} />
                                                <span>{resource} ({remaining})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Help Text */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--ui-muted)]">
                    <TabletopStatusIcon type="info" size={15} />
                    <p>Players with commodities will choose which one to give you.</p>
                </div>
        </TabletopModal>
    );
};
