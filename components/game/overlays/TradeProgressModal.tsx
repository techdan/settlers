'use client';

import React from 'react';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { GameState } from '@/lib/types';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface TradeProgressModalProps {
    gameState: GameState;
    playerId: string;
    onCancel: () => void;
}

const TRADE_ITEM_LABELS: Record<ResourceType | CommodityType, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore',
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin'
};

const isCommodity = (type: ResourceType | CommodityType): type is CommodityType =>
    type === 'paper' || type === 'cloth' || type === 'coin';

const TradeItemIcon: React.FC<{ type: ResourceType | CommodityType }> = ({ type }) =>
    isCommodity(type)
        ? <TabletopCommodityIcon type={type} size={24} label={TRADE_ITEM_LABELS[type]} />
        : <TabletopResourceIcon type={type} size={24} label={TRADE_ITEM_LABELS[type]} />;

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

    // Format items to display
    const formatItems = (
        resources: Record<ResourceType, number>,
        commodities?: Record<CommodityType, number>
    ): { type: ResourceType | CommodityType; count: number }[] => {
        const items: { type: ResourceType | CommodityType; count: number }[] = [];

        // Add resources
        Object.entries(resources).forEach(([type, count]) => {
            if (count > 0) {
                items.push({ type: type as ResourceType, count });
            }
        });

        // Add commodities
        if (commodities) {
            Object.entries(commodities).forEach(([type, count]) => {
                if (count > 0) {
                    items.push({ type: type as CommodityType, count });
                }
            });
        }

        return items;
    };

    const givingItems = formatItems(tradeOffer.give, tradeOffer.giveCommodities);
    const gettingItems = formatItems(tradeOffer.get, tradeOffer.getCommodities);

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
                            {/* You Give */}
                            <div>
                                <div className="text-xs text-[var(--ui-muted)] uppercase mb-2">You Give</div>
                                <div className="space-y-2">
                                    {givingItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <TradeItemIcon type={item.type} />
                                            <span className="text-sm text-[var(--ui-text)]">
                                                {item.count}x {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* You Get */}
                            <div>
                                <div className="text-xs text-[var(--ui-muted)] uppercase mb-2">You Get</div>
                                <div className="space-y-2">
                                    {gettingItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <TradeItemIcon type={item.type} />
                                            <span className="text-sm text-[var(--ui-text)]">
                                                {item.count}x {TRADE_ITEM_LABELS[item.type]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
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
