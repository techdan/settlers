import React, { useTransition } from 'react';
import { GameState, TradeOffer } from '@/lib/game-types';
import { ResourceType } from '@/lib/board-data';
import { acceptTrade, cancelTrade } from '@/app/actions';

interface TradeOfferDisplayProps {
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

export const TradeOfferDisplay: React.FC<TradeOfferDisplayProps> = ({ gameState, playerId }) => {
    const [isPending, startTransition] = useTransition();
    const offer = gameState.tradeOffer;

    if (!offer || offer.status !== 'open') return null;

    const isInitiator = offer.initiator === playerId;
    const initiatorName = gameState.players.find(p => p.id === offer.initiator)?.name || 'Unknown';
    const player = gameState.players.find(p => p.id === playerId);

    if (!player) return null;

    // Check if player can afford to accept
    let canAfford = true;
    if (!isInitiator) {
        for (const [res, amount] of Object.entries(offer.get)) {
            if ((player.resources[res as ResourceType] || 0) < amount) {
                canAfford = false;
                break;
            }
        }
    }

    const handleAccept = () => {
        startTransition(async () => {
            try {
                await acceptTrade(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to accept trade", e);
            }
        });
    };

    const handleCancel = () => {
        startTransition(async () => {
            try {
                await cancelTrade(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to cancel trade", e);
            }
        });
    };

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-yellow-500/50 p-4 rounded-xl shadow-2xl z-40 animate-in fade-in slide-in-from-top-4">
            <div className="text-center text-yellow-400 font-bold mb-2 text-sm uppercase tracking-wider">
                {isInitiator ? 'Your Active Offer' : `Trade Offer from ${initiatorName}`}
            </div>

            <div className="flex items-center gap-4 justify-center mb-4">
                {/* They Give */}
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 text-center">{isInitiator ? 'You Give' : 'They Give'}</div>
                    <div className="flex gap-2">
                        {Object.entries(offer.give).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded">
                                    <span>{RESOURCE_ICONS[res as ResourceType]}</span>
                                    <span className="font-bold text-white">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-slate-500 font-bold">➜</div>

                {/* They Get */}
                <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 text-center">{isInitiator ? 'You Get' : 'They Want'}</div>
                    <div className="flex gap-2">
                        {Object.entries(offer.get).map(([res, amount]) => {
                            if (amount === 0) return null;
                            return (
                                <div key={res} className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded">
                                    <span>{RESOURCE_ICONS[res as ResourceType]}</span>
                                    <span className="font-bold text-white">{amount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                {isInitiator ? (
                    <button
                        onClick={handleCancel}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                        {isPending ? 'Cancelling...' : 'Cancel Offer'}
                    </button>
                ) : (
                    <button
                        onClick={handleAccept}
                        disabled={!canAfford || isPending}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                        {isPending ? 'Accepting...' : canAfford ? 'Accept Trade' : 'Cannot Afford'}
                    </button>
                )}
            </div>
        </div>
    );
};
