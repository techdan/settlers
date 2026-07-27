'use client';

import React from 'react';
import { GameState } from '@/lib/types';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { CardTally, cardCountsFrom } from '@/components/game/ui/CardToken';

interface TradeProgressModalProps {
    gameState: GameState;
    playerId: string;
    onCancel: () => void;
}

export const TradeProgressModal: React.FC<TradeProgressModalProps> = ({
    gameState,
    playerId,
    onCancel
}) => {
    const tradeOffer = gameState.tradeOffer;

    // Only show if there's an active trade offer from this player
    if (!tradeOffer || tradeOffer.initiator !== playerId || tradeOffer.status !== 'open') {
        return null;
    }

    const givingCounts = cardCountsFrom(tradeOffer.give, tradeOffer.giveCommodities);
    const gettingCounts = cardCountsFrom(tradeOffer.get, tradeOffer.getCommodities);

    // Get list of players and their response status
    const otherPlayers = gameState.players.filter(p => p.id !== playerId);
    const rejectedBy = tradeOffer.rejectedBy || [];

    return (
        <TabletopModal
            title="Trade Offer Sent"
            description="Waiting for the other players to respond."
            onClose={onCancel}
            closeLabel="Cancel trade"
            footer={<TabletopButton variant="danger" onClick={onCancel} className="w-full">Cancel Trade</TabletopButton>}
        >
                <div className="text-center">
                    {/* Icon and title */}
                    <div className="mb-4">
                        <TabletopStatusIcon type="trade" size={40} label="Trade offer" className="mx-auto" />
                    </div>

                    {/* Trade details */}
                    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="mb-2 text-xs uppercase text-[var(--ui-muted)]">You Give</div>
                                <CardTally counts={givingCounts} />
                            </div>
                            <div>
                                <div className="mb-2 text-xs uppercase text-[var(--ui-muted)]">You Get</div>
                                <CardTally counts={gettingCounts} />
                            </div>
                        </div>
                    </div>

                    {/* Player responses */}
                    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-3">
                        <div className="text-xs text-[var(--ui-muted)] uppercase mb-2">Player Responses</div>
                        <div className="space-y-1">
                            {otherPlayers.map(player => {
                                const hasRejected = rejectedBy.includes(player.id);
                                return (
                                    <div key={player.id} className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--ui-text)]">{player.name}</span>
                                        <span className={`flex items-center gap-1 text-xs ${hasRejected ? 'text-[var(--ui-danger)]' : 'text-[var(--ui-accent)]'}`}>
                                            <TabletopStatusIcon type={hasRejected ? 'cancel' : 'time'} size={15} />
                                            {hasRejected ? 'Rejected' : 'Waiting...'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
        </TabletopModal>
    );
};
