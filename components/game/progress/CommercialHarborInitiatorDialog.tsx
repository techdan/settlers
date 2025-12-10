import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { playProgressCard, makeCommercialHarborOffers, cancelCommercialHarbor } from '@/app/actions';

interface CommercialHarborInitiatorDialogProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
    onClose?: () => void;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: '🌲',
    brick: '🧱',
    wheat: '🌾',
    sheep: '🐑',
    ore: '⛰️'
};

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-900 border border-yellow-500/60 rounded-xl shadow-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto text-white relative">
                {/* Close Button */}
                <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-2xl leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close"
                >
                    ×
                </button>

                {/* Header */}
                <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-yellow-100 mb-2">
                        🏘️ Commercial Harbor
                    </div>
                    <div className="text-sm text-slate-300">
                        Select which resource to offer each player (or select "No Trade")
                    </div>
                </div>

                {/* Player List with Dropdowns */}
                <div className="space-y-2 mb-4">
                    {opponents.map(opponent => {
                        const hasCommodities = opponent.commodities &&
                            (opponent.commodities.paper > 0 || opponent.commodities.cloth > 0 || opponent.commodities.coin > 0);

                        return (
                            <div key={opponent.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3">
                                {/* Player Name */}
                                <div className="flex-1">
                                    <div className="font-semibold">{opponent.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {hasCommodities ? '✓ Has commodities' : '✗ No commodities'}
                                    </div>
                                </div>

                                {/* Resource Dropdown */}
                                <select
                                    value={selectedResources[opponent.id] || ''}
                                    onChange={(e) => handleResourceChange(opponent.id, e.target.value as ResourceType | null || null)}
                                    disabled={isSubmitting || !hasCommodities}
                                    className={`px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm min-w-[180px] ${
                                        !hasCommodities ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <option value="">No Trade</option>
                                    {(['wood', 'brick', 'wheat', 'sheep', 'ore'] as ResourceType[]).map(resource => {
                                        const needed = resourcesNeeded[resource];
                                        const available = player.resources[resource] || 0;
                                        const remaining = available - needed;

                                        return (
                                            <option key={resource} value={resource}>
                                                {RESOURCE_ICONS[resource]} {resource.charAt(0).toUpperCase() + resource.slice(1)} ({remaining})
                                            </option>
                                        );
                                    })}
                                </select>
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

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-lg font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-lg font-semibold transition-colors bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Making Offers...' : 'Make Offers'}
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-4 text-xs text-slate-400 text-center">
                    <p>💡 Players with commodities will choose which one to give you.</p>
                </div>
            </div>
        </div>
    );
};

// Component showing status while waiting for responses
const OfferStatusDialog: React.FC<{
    gameState: GameState;
    playerId: string;
}> = ({ gameState, playerId }) => {
    const harbor = gameState.pendingCommercialHarbor!;
    const player = gameState.players.find(p => p.id === playerId)!;

    const offersWithTrades = harbor.offers.filter(o => o.offeredResource !== null);
    const respondedOffers = offersWithTrades.filter(o => o.response !== undefined);
    const pendingOffers = offersWithTrades.filter(o => o.response === undefined);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-900 border border-yellow-500/60 rounded-xl shadow-2xl p-6 w-[500px] text-white">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-yellow-100 mb-2">
                        🏘️ Commercial Harbor
                    </div>
                    <div className="text-sm text-slate-300">
                        Waiting for {pendingOffers.length} player{pendingOffers.length === 1 ? '' : 's'} to respond...
                    </div>
                </div>

                {/* Progress */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="text-2xl font-bold text-yellow-300">{respondedOffers.length}</div>
                        <div className="text-slate-400">/</div>
                        <div className="text-2xl font-bold text-slate-300">{offersWithTrades.length}</div>
                        <div className="text-sm text-slate-400">responded</div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(respondedOffers.length / offersWithTrades.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Offer List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {harbor.offers
                        .filter(o => o.offeredResource !== null)
                        .map(offer => {
                            const opponent = gameState.players.find(p => p.id === offer.targetPlayerId);
                            if (!opponent) return null;

                            const hasResponded = offer.response !== undefined;

                            return (
                                <div
                                    key={offer.targetPlayerId}
                                    className={`flex items-center gap-3 p-3 rounded-lg ${
                                        hasResponded ? 'bg-green-900/20 border border-green-500/30' : 'bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold">{opponent.name}</div>
                                        <div className="text-xs text-slate-400">
                                            Offered: {offer.offeredResource}
                                        </div>
                                    </div>
                                    <div className="text-sm">
                                        {hasResponded ? (
                                            offer.response ? (
                                                <span className="text-green-400">✓ Gave {offer.response}</span>
                                            ) : (
                                                <span className="text-slate-400">✓ No commodities</span>
                                            )
                                        ) : (
                                            <span className="text-yellow-400">⏳ Waiting...</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Help Text */}
                <div className="mt-4 text-xs text-slate-400 text-center">
                    <p>You can continue your turn while players respond.</p>
                    <p>The turn cannot end until all responses are received.</p>
                </div>
            </div>
        </div>
    );
};
