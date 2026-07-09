import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { getPortForVertex } from '@/core/engine/board/port-generator';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
import { TradeController } from '@/lib/controllers/trade-controller';
import { GameIcon } from '@/components/ui/icons/GameIcon';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 shadow-2xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Trade</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('bank')}
                            className={`px-4 py-1 rounded-full text-sm font-bold cursor-pointer ${mode === 'bank' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >Bank</button>
                        <button
                            onClick={() => setMode('domestic')}
                            className={`px-4 py-1 rounded-full text-sm font-bold cursor-pointer ${mode === 'domestic' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >Players</button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>

                {mode === 'bank' ? (
                    <>
                        <div className="flex items-center justify-between gap-4 mb-8">
                            {/* Give Side */}
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center">
                                <div className="text-xs text-slate-400 uppercase mb-2">Give</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <GameIcon type={giveRes as TradeItem} size={32} />
                                    <span className="text-sm text-white font-semibold">{TRADE_ITEM_LABELS[giveRes as TradeItem]}</span>
                                </div>
                                <select
                                    value={giveRes}
                                    onChange={e => setGiveRes(e.target.value as ResourceType | CommodityType)}
                                    className="bg-slate-700 text-white rounded p-2 w-full mb-2 text-center appearance-none cursor-pointer hover:bg-slate-600"
                                >
                                    {ALL_TYPES.map(r => {
                                        const count = isCommodity(r) ? (player.commodities?.[r as CommodityType] || 0) : (player.resources[r as ResourceType] || 0);
                                        return (
                                            <option key={r} value={r}>{TRADE_ITEM_LABELS[r as TradeItem]} ({count})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="text-2xl font-bold text-slate-500">➜</div>

                            {/* Get Side */}
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center">
                                <div className="text-xs text-slate-400 uppercase mb-2">Get</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <GameIcon type={getRes as TradeItem} size={32} />
                                    <span className="text-sm text-white font-semibold">{TRADE_ITEM_LABELS[getRes as TradeItem]}</span>
                                </div>
                                <select
                                    value={getRes}
                                    onChange={e => setGetRes(e.target.value as ResourceType | CommodityType)}
                                    className="bg-slate-700 text-white rounded p-2 w-full mb-2 text-center appearance-none cursor-pointer hover:bg-slate-600"
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

                        <div className="bg-slate-800 p-4 rounded-lg mb-6 text-center">
                            <div className="text-slate-400 mb-1">Exchange Rate</div>
                            <div className="text-3xl font-bold text-white">
                                {ratio} : 1
                            </div>
                            {ratio < 4 && (
                                <div className="text-xs text-green-400 mt-1">
                                    {merchantFleetTradeItem === giveRes
                                        ? 'Merchant Fleet active'
                                        : gameState.activeMerchant === playerId && merchantHexResource === giveRes
                                            ? 'Merchant discount'
                                            : 'Port / Trading House bonus'}
                                </div>
                            )}
                            {merchantFleetTradeItem && (
                                <div className="text-xs text-amber-200 mt-2">
                                    Merchant Fleet: {merchantFleetTradeItem} trades at 2:1 this turn.
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleBankTrade}
                            disabled={!canAffordBank || giveRes === getRes || isPending}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isPending
                                ? 'Trading...'
                                : `Trade ${ratio} ${TRADE_ITEM_LABELS[giveRes]} for 1 ${TRADE_ITEM_LABELS[getRes]}`}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            {/* Offer Give */}
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <h3 className="text-center text-slate-300 mb-4 font-bold">You Give</h3>
                                <div className="space-y-2">
                                    {/* Resources */}
                                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => {
                                        const current = player.resources[res] || 0;
                                        const giving = offerGive[res] || 0;
                                        const getting = offerGet[res] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-slate-300';
                                        if (projected < current) colorClass = 'text-red-400';
                                        if (projected > current) colorClass = 'text-green-400';

                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <GameIcon type={res} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[res]}</span>
                                                    <span className="text-xs text-slate-400">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateOffer('give', res, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">-</button>
                                                    <span className="w-4 text-center text-slate-100">{offerGive[res]}</span>
                                                    <button onClick={() => updateOffer('give', res, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer" disabled={offerGive[res] >= (player.resources[res] || 0)}>+</button>
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

                                        let colorClass = 'text-slate-300';
                                        if (projected < current) colorClass = 'text-red-400';
                                        if (projected > current) colorClass = 'text-green-400';

                                        return (
                                            <div key={comm} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <GameIcon type={comm} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[comm]}</span>
                                                    <span className="text-xs text-slate-400">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateCommodityOffer('give', comm, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">-</button>
                                                    <span className="w-4 text-center text-slate-100">{offerGiveCommodities[comm]}</span>
                                                    <button onClick={() => updateCommodityOffer('give', comm, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer" disabled={offerGiveCommodities[comm] >= (player.commodities?.[comm] || 0)}>+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Offer Get */}
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <h3 className="text-center text-slate-300 mb-4 font-bold">You Get</h3>
                                <div className="space-y-2">
                                    {/* Resources */}
                                    {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map(res => {
                                        const current = player.resources[res] || 0;
                                        const giving = offerGive[res] || 0;
                                        const getting = offerGet[res] || 0;
                                        const projected = current - giving + getting;

                                        let colorClass = 'text-slate-300';
                                        if (projected < current) colorClass = 'text-red-400';
                                        if (projected > current) colorClass = 'text-green-400';

                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <GameIcon type={res} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[res]}</span>
                                                    <span className="text-xs text-slate-400">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateOffer('get', res, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">-</button>
                                                    <span className="w-4 text-center text-slate-100">{offerGet[res]}</span>
                                                    <button onClick={() => updateOffer('get', res, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">+</button>
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

                                        let colorClass = 'text-slate-300';
                                        if (projected < current) colorClass = 'text-red-400';
                                        if (projected > current) colorClass = 'text-green-400';

                                        return (
                                            <div key={comm} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <GameIcon type={comm} size={22} />
                                                    <span className={`text-sm capitalize ${colorClass}`}>{TRADE_ITEM_LABELS[comm]}</span>
                                                    <span className="text-xs text-slate-400">({projected})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateCommodityOffer('get', comm, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">-</button>
                                                    <span className="w-4 text-center text-slate-100">{offerGetCommodities[comm]}</span>
                                                    <button onClick={() => updateCommodityOffer('get', comm, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer">+</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleOfferTrade}
                            disabled={isPending}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Offering...' : 'Offer Trade 🤝'}
                        </button>
                    </>
                )}

                {/* Trade Confirmation Overlay */}
                {tradeConfirmation && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl z-10">
                        <div className="bg-slate-800 border-2 border-green-600 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
                            <div className="text-center">
                                {/* Success icon */}
                                <div className="text-green-400 text-4xl mb-2">✓</div>
                                <h2 className="text-xl font-bold text-white mb-4">Trade Complete!</h2>

                                {/* Trade details */}
                                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                                    <div className="flex items-center justify-center gap-3 text-lg">
                                        <div className="flex items-center gap-2">
                                            <GameIcon type={tradeConfirmation.gave as TradeItem} size={22} />
                                            <span className="text-white font-semibold">
                                                {tradeConfirmation.gaveAmount} {TRADE_ITEM_LABELS[tradeConfirmation.gave as TradeItem]}
                                            </span>
                                        </div>
                                        <span className="text-slate-400">→</span>
                                        <div className="flex items-center gap-2">
                                            <GameIcon type={tradeConfirmation.received as TradeItem} size={22} />
                                            <span className="text-white font-semibold">
                                                1 {TRADE_ITEM_LABELS[tradeConfirmation.received as TradeItem]}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-slate-300 mb-6">
                                    You traded <span className="font-semibold text-yellow-400">{tradeConfirmation.gaveAmount} {TRADE_ITEM_LABELS[tradeConfirmation.gave as TradeItem]}</span> for{' '}
                                    <span className="font-semibold text-yellow-400">1 {TRADE_ITEM_LABELS[tradeConfirmation.received as TradeItem]}</span>
                                </p>

                                {/* OK button */}
                                <button
                                    onClick={() => setTradeConfirmation(null)}
                                    className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
