import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { getPortForVertex } from '@/core/engine/board/port-generator';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TradeController } from '@/lib/controllers/trade-controller';
import { TabletopCommodityIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface TradeModalProps {
    gameState: GameState;
    playerId: string;
    onClose: () => void;
    tradeController: TradeController;
}

type TradeItem = ResourceType | CommodityType;

const ALL_TYPES = [
    'wood', 'brick', 'sheep', 'wheat', 'ore',
    'paper', 'cloth', 'coin'
] as const;

const TRADE_ITEM_LABELS: Record<TradeItem, string> = {
    wood: 'Wood',
    brick: 'Brick',
    sheep: 'Sheep',
    wheat: 'Wheat',
    ore: 'Ore',
    paper: 'Paper',
    cloth: 'Cloth',
    coin: 'Coin'
};

const createEmptyOffer = (): Record<ResourceType, number> => ({
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0
});

const createEmptyCommodityOffer = (): Record<CommodityType, number> => ({
    paper: 0,
    cloth: 0,
    coin: 0
});

function isCommodity(type: string): type is CommodityType {
    return ['paper', 'cloth', 'coin'].includes(type);
}

const TradeItemIcon: React.FC<{ type: TradeItem; size?: number }> = ({ type, size = 24 }) =>
    isCommodity(type)
        ? <TabletopCommodityIcon type={type} size={size} label={TRADE_ITEM_LABELS[type]} />
        : <TabletopResourceIcon type={type} size={size} label={TRADE_ITEM_LABELS[type]} />;

export const TradeModal: React.FC<TradeModalProps> = ({ gameState, playerId, onClose, tradeController }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<'bank' | 'domestic'>('bank');
    const [tradeConfirmation, setTradeConfirmation] = useState<{
        gave: TradeItem;
        gaveAmount: number;
        received: TradeItem;
    } | null>(null);

    type MerchantFleetEffect = {
        type: 'merchant_fleet';
        playerId: string;
        tradeItem: TradeItem;
    };

    const terrainToResource: Record<string, ResourceType | null> = {
        forest: 'wood',
        hill: 'brick',
        pasture: 'sheep',
        field: 'wheat',
        mountain: 'ore',
        desert: null,
        ocean: null
    };

    const merchantHexResource = gameState.merchantHexId
        ? terrainToResource[gameState.board.hexes.find(h => h.id === gameState.merchantHexId)?.terrain || ''] ?? null
        : null;

    const merchantFleetEffect = (gameState.activeEffects || []).find(
        (effect): effect is MerchantFleetEffect =>
            !!effect &&
            effect.type === 'merchant_fleet' &&
            effect.playerId === playerId &&
            typeof effect.tradeItem === 'string'
    );
    const merchantFleetTradeItem = merchantFleetEffect?.tradeItem;

    // Bank State
    const [giveRes, setGiveRes] = useState<TradeItem>('wood');
    const [getRes, setGetRes] = useState<TradeItem>('brick');

    // Domestic State
    const [offerGive, setOfferGive] = useState<Record<ResourceType, number>>(() => createEmptyOffer());
    const [offerGet, setOfferGet] = useState<Record<ResourceType, number>>(() => createEmptyOffer());
    const [offerGiveCommodities, setOfferGiveCommodities] = useState<Record<CommodityType, number>>(() => createEmptyCommodityOffer());
    const [offerGetCommodities, setOfferGetCommodities] = useState<Record<CommodityType, number>>(() => createEmptyCommodityOffer());

    if (!player) return null;

    // Bank Logic
    let ratio = 4;

    if (merchantFleetTradeItem === giveRes) {
        ratio = 2;
    } else if (isCommodity(giveRes)) {
        // Trading House ability (Trade Level 3+)
        if ((player.improvements?.trade || 0) >= 3) {
            ratio = 2;
        }
    } else {
        if (gameState.activeMerchant === playerId && merchantHexResource === giveRes) {
            ratio = 2;
        }

        for (const vertexId in gameState.board.vertices) {
            const vertex = gameState.board.vertices[vertexId];
            if (vertex.owner === playerId && vertex.structure) {
                const portType = getPortForVertex(vertexId);
                if (portType) {
                    if (portType === giveRes) {
                        ratio = 2;
                        break;
                    } else if (portType === 'generic') {
                        ratio = Math.min(ratio, 3);
                    }
                }
            }
        }
    }

    const canAffordBank = isCommodity(giveRes)
        ? (player.commodities?.[giveRes] || 0) >= ratio
        : (player.resources[giveRes] || 0) >= ratio;

    const handleBankTrade = () => {
        if (giveRes === getRes) return;
        const currentRatio = ratio; // Capture the current ratio before async operation
        const currentGiveRes = giveRes;
        const currentGetRes = getRes;
        startTransition(async () => {
            try {
                await tradeController.handleBankTrade(currentGiveRes, currentGetRes);
                // Show confirmation message
                setTradeConfirmation({
                    gave: currentGiveRes,
                    gaveAmount: currentRatio,
                    received: currentGetRes
                });
            } catch (e) {
                console.error("Failed to trade", e);
            }
        });
    };

    // Domestic Logic
    const handleOfferTrade = () => {
        startTransition(async () => {
            try {
                await tradeController.handleOfferTrade(offerGive, offerGet, offerGiveCommodities, offerGetCommodities);
                setOfferGive(createEmptyOffer());
                setOfferGet(createEmptyOffer());
                setOfferGiveCommodities(createEmptyCommodityOffer());
                setOfferGetCommodities(createEmptyCommodityOffer());
                // Close the trade modal after successfully offering a trade
                onClose();
            } catch (e) {
                console.error("Failed to offer trade", e);
            }
        });
    };

    const updateOffer = (type: 'give' | 'get', res: ResourceType, delta: number) => {
        if (type === 'give') {
            const current = offerGive[res];
            if (current + delta >= 0 && current + delta <= player.resources[res]) {
                setOfferGive(prev => ({ ...prev, [res]: current + delta }));
            }
        } else {
            const current = offerGet[res];
            if (current + delta >= 0) {
                setOfferGet(prev => ({ ...prev, [res]: current + delta }));
            }
        }
    };

    const updateCommodityOffer = (type: 'give' | 'get', comm: CommodityType, delta: number) => {
        if (type === 'give') {
            const current = offerGiveCommodities[comm];
            if (current + delta >= 0 && current + delta <= (player.commodities?.[comm] || 0)) {
                setOfferGiveCommodities(prev => ({ ...prev, [comm]: current + delta }));
            }
        } else {
            const current = offerGetCommodities[comm];
            if (current + delta >= 0) {
                setOfferGetCommodities(prev => ({ ...prev, [comm]: current + delta }));
            }
        }
    };

    return (
        <TabletopModal
            title="Trade"
            description="Exchange with the bank or propose a deal to the other players."
            onClose={onClose}
            width="lg"
            bodyClassName="relative"
        >
                <div className="mb-6 flex justify-center">
                    <div className="flex gap-2" role="group" aria-label="Trade mode">
                        <button
                            onClick={() => setMode('bank')}
                            className={`min-h-11 cursor-pointer rounded-full border px-4 py-1 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${mode === 'bank' ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]' : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] hover:text-[var(--ui-text)]'}`}
                        >Bank</button>
                        <button
                            onClick={() => setMode('domestic')}
                            className={`min-h-11 cursor-pointer rounded-full border px-4 py-1 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${mode === 'domestic' ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]' : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] text-[var(--ui-muted)] hover:text-[var(--ui-text)]'}`}
                        >Players</button>
                    </div>
                </div>

                {mode === 'bank' ? (
                    <>
                        <div className="flex items-center justify-between gap-4 mb-8">
                            {/* Give Side */}
                            <div className="flex flex-1 flex-col items-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                <div className="mb-2 text-xs uppercase text-[var(--ui-muted)]">Give</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <TradeItemIcon type={giveRes} size={32} />
                                    <span className="text-sm font-semibold text-[var(--ui-text)]">{TRADE_ITEM_LABELS[giveRes]}</span>
                                </div>
                                <select
                                    value={giveRes}
                                    onChange={e => setGiveRes(e.target.value as ResourceType | CommodityType)}
                                    className="mb-2 min-h-11 w-full cursor-pointer appearance-none rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-2 text-center text-[var(--ui-text)] hover:brightness-110"
                                >
                                    {ALL_TYPES.map(r => {
                                        const count = isCommodity(r) ? (player.commodities?.[r as CommodityType] || 0) : (player.resources[r as ResourceType] || 0);
                                        return (
                                            <option key={r} value={r}>{TRADE_ITEM_LABELS[r as TradeItem]} ({count})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <TabletopStatusIcon type="trade" size={30} label="Exchange" />

                            {/* Get Side */}
                            <div className="flex flex-1 flex-col items-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                <div className="mb-2 text-xs uppercase text-[var(--ui-muted)]">Get</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <TradeItemIcon type={getRes} size={32} />
                                    <span className="text-sm font-semibold text-[var(--ui-text)]">{TRADE_ITEM_LABELS[getRes]}</span>
                                </div>
                                <select
                                    value={getRes}
                                    onChange={e => setGetRes(e.target.value as ResourceType | CommodityType)}
                                    className="mb-2 min-h-11 w-full cursor-pointer appearance-none rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-2 text-center text-[var(--ui-text)] hover:brightness-110"
                                >
                                    {ALL_TYPES.map(r => {
                                        const count = isCommodity(r) ? (player.commodities?.[r as CommodityType] || 0) : (player.resources[r as ResourceType] || 0);
                                        return (
                                            <option key={r} value={r}>{TRADE_ITEM_LABELS[r as TradeItem]} ({count})</option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="mb-6 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4 text-center">
                            <div className="mb-1 text-[var(--ui-muted)]">Exchange Rate</div>
                            <div className="text-3xl font-bold text-[var(--ui-text)]">
                                {ratio} : 1
                            </div>
                            {ratio < 4 && (
                                <div className="mt-1 text-xs text-[var(--ui-success)]">
                                    {merchantFleetTradeItem === giveRes
                                        ? 'Merchant Fleet active'
                                        : gameState.activeMerchant === playerId && merchantHexResource === giveRes
                                            ? 'Merchant discount'
                                            : 'Port / Trading House bonus'}
                                </div>
                            )}
                            {merchantFleetTradeItem && (
                                <div className="mt-2 text-xs text-[var(--ui-accent)]">
                                    Merchant Fleet: {merchantFleetTradeItem} trades at 2:1 this turn.
                                </div>
                            )}
                        </div>

                        <TabletopButton
                            onClick={handleBankTrade}
                            disabled={!canAffordBank || giveRes === getRes || isPending}
                            variant="primary"
                            className="w-full py-3"
                        >
                            {isPending
                                ? 'Trading...'
                                : `Trade ${ratio} ${TRADE_ITEM_LABELS[giveRes]} for 1 ${TRADE_ITEM_LABELS[getRes]}`}
                        </TabletopButton>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            {/* Offer Give */}
                            <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                <h3 className="mb-4 text-center font-bold text-[var(--ui-text)]">You Give</h3>
                                <div className="space-y-2">
                                    {/* Resources */}
                                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => {
                                        const current = player.resources[res] || 0;
                                        const giving = offerGive[res] || 0;
                                        const getting = offerGet[res] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-[var(--ui-text)]';
                                        if (projected < current) colorClass = 'text-[var(--ui-danger)]';
                                        if (projected > current) colorClass = 'text-[var(--ui-success)]';

                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <TradeItemIcon type={res} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[res]}</span>
                                                    <span className="text-xs text-[var(--ui-muted)]">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button aria-label={`Give 1 fewer ${TRADE_ITEM_LABELS[res]}`} onClick={() => updateOffer('give', res, -1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">−</button>
                                                    <span className="w-4 text-center text-[var(--ui-text)]">{offerGive[res]}</span>
                                                    <button aria-label={`Give 1 more ${TRADE_ITEM_LABELS[res]}`} onClick={() => updateOffer('give', res, 1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" disabled={offerGive[res] >= (player.resources[res] || 0)}>+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Commodities */}
                                    {(['paper', 'cloth', 'coin'] as CommodityType[]).map(comm => {
                                        const current = player.commodities?.[comm] || 0;
                                        const giving = offerGiveCommodities[comm] || 0;
                                        const getting = offerGetCommodities[comm] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-[var(--ui-text)]';
                                        if (projected < current) colorClass = 'text-[var(--ui-danger)]';
                                        if (projected > current) colorClass = 'text-[var(--ui-success)]';

                                        return (
                                            <div key={comm} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <TradeItemIcon type={comm} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[comm]}</span>
                                                    <span className="text-xs text-[var(--ui-muted)]">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button aria-label={`Give 1 fewer ${TRADE_ITEM_LABELS[comm]}`} onClick={() => updateCommodityOffer('give', comm, -1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">−</button>
                                                    <span className="w-4 text-center text-[var(--ui-text)]">{offerGiveCommodities[comm]}</span>
                                                    <button aria-label={`Give 1 more ${TRADE_ITEM_LABELS[comm]}`} onClick={() => updateCommodityOffer('give', comm, 1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" disabled={offerGiveCommodities[comm] >= (player.commodities?.[comm] || 0)}>+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Offer Get */}
                            <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                <h3 className="mb-4 text-center font-bold text-[var(--ui-text)]">You Get</h3>
                                <div className="space-y-2">
                                    {/* Resources */}
                                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => {
                                        const current = player.resources[res] || 0;
                                        const giving = offerGive[res] || 0;
                                        const getting = offerGet[res] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-[var(--ui-text)]';
                                        if (projected < current) colorClass = 'text-[var(--ui-danger)]';
                                        if (projected > current) colorClass = 'text-[var(--ui-success)]';

                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <TradeItemIcon type={res} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[res]}</span>
                                                    <span className="text-xs text-[var(--ui-muted)]">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button aria-label={`Request 1 fewer ${TRADE_ITEM_LABELS[res]}`} onClick={() => updateOffer('get', res, -1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">−</button>
                                                    <span className="w-4 text-center text-[var(--ui-text)]">{offerGet[res]}</span>
                                                    <button aria-label={`Request 1 more ${TRADE_ITEM_LABELS[res]}`} onClick={() => updateOffer('get', res, 1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Commodities */}
                                    {(['paper', 'cloth', 'coin'] as CommodityType[]).map(comm => {
                                        const current = player.commodities?.[comm] || 0;
                                        const giving = offerGiveCommodities[comm] || 0;
                                        const getting = offerGetCommodities[comm] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-[var(--ui-text)]';
                                        if (projected < current) colorClass = 'text-[var(--ui-danger)]';
                                        if (projected > current) colorClass = 'text-[var(--ui-success)]';

                                        return (
                                            <div key={comm} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <TradeItemIcon type={comm} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[comm]}</span>
                                                    <span className="text-xs text-[var(--ui-muted)]">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button aria-label={`Request 1 fewer ${TRADE_ITEM_LABELS[comm]}`} onClick={() => updateCommodityOffer('get', comm, -1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">−</button>
                                                    <span className="w-4 text-center text-[var(--ui-text)]">{offerGetCommodities[comm]}</span>
                                                    <button aria-label={`Request 1 more ${TRADE_ITEM_LABELS[comm]}`} onClick={() => updateCommodityOffer('get', comm, 1)} className="h-11 w-11 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] hover:brightness-110">+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <TabletopButton
                            onClick={handleOfferTrade}
                            disabled={isPending}
                            variant="primary"
                            className="flex w-full items-center justify-center gap-2 py-3"
                        >
                            {!isPending && <TabletopStatusIcon type="trade" size={18} />}
                            {isPending ? 'Offering...' : 'Offer Trade'}
                        </TabletopButton>
                    </>
                )}

                {/* Trade Confirmation Overlay */}
                {tradeConfirmation && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                        <div className="mx-4 w-full max-w-sm rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] p-6 shadow-2xl">
                            <div className="text-center">
                                {/* Success icon */}
                                <TabletopStatusIcon type="confirm" size={40} label="Trade completed" className="mx-auto mb-2" />
                                <h2 className="mb-4 font-serif text-xl font-bold text-[var(--ui-text)]">Trade Complete!</h2>

                                {/* Trade details */}
                                <div className="mb-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                    <div className="flex items-center justify-center gap-3 text-lg">
                                        <div className="flex items-center gap-2">
                                            <TradeItemIcon type={tradeConfirmation.gave} size={22} />
                                            <span className="font-semibold text-[var(--ui-text)]">
                                                {tradeConfirmation.gaveAmount} {TRADE_ITEM_LABELS[tradeConfirmation.gave]}
                                            </span>
                                        </div>
                                        <span className="text-[var(--ui-muted)]" aria-hidden="true">→</span>
                                        <div className="flex items-center gap-2">
                                            <TradeItemIcon type={tradeConfirmation.received} size={22} />
                                            <span className="font-semibold text-[var(--ui-text)]">
                                                1 {TRADE_ITEM_LABELS[tradeConfirmation.received]}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="mb-6 text-[var(--ui-muted)]">
                                    You traded <span className="font-semibold text-[var(--ui-accent)]">{tradeConfirmation.gaveAmount} {TRADE_ITEM_LABELS[tradeConfirmation.gave]}</span> for{' '}
                                    <span className="font-semibold text-[var(--ui-accent)]">1 {TRADE_ITEM_LABELS[tradeConfirmation.received]}</span>
                                </p>

                                {/* OK button */}
                                <TabletopButton
                                    onClick={() => setTradeConfirmation(null)}
                                    variant="primary"
                                    className="w-full py-3"
                                >
                                    OK
                                </TabletopButton>
                            </div>
                        </div>
                    </div>
                )}
        </TabletopModal>
    );
};
