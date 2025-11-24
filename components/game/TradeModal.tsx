import React, { useState, useTransition } from 'react';
import { GameState, PlayerState } from '@/lib/game-types';
import { ResourceType, getPortForVertex } from '@/lib/board-data';
import { tradeWithBank, offerTrade } from '@/app/actions';

interface TradeModalProps {
    gameState: GameState;
    playerId: string;
    onClose: () => void;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
    wood: '🌲',
    brick: '🧱',
    sheep: '🐑',
    wheat: '🌾',
    ore: '🪨',
    desert: '🌵',
};

export const TradeModal: React.FC<TradeModalProps> = ({ gameState, playerId, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<'bank' | 'domestic'>('bank');

    // Bank State
    const [giveRes, setGiveRes] = useState<ResourceType>('wood');
    const [getRes, setGetRes] = useState<ResourceType>('brick');

    // Domestic State
    const [offerGive, setOfferGive] = useState<Record<ResourceType, number>>({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, desert: 0 });
    const [offerGet, setOfferGet] = useState<Record<ResourceType, number>>({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, desert: 0 });

    if (!player) return null;

    // Bank Logic
    let ratio = 4;
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
    const canAffordBank = (player.resources[giveRes] || 0) >= ratio;

    const handleBankTrade = () => {
        if (giveRes === getRes) return;
        startTransition(async () => {
            try {
                await tradeWithBank(gameState.roomId, playerId, giveRes, getRes);
                onClose();
            } catch (e) {
                console.error("Failed to trade", e);
            }
        });
    };

    // Domestic Logic
    const handleOfferTrade = () => {
        startTransition(async () => {
            try {
                await offerTrade(gameState.roomId, playerId, offerGive, offerGet);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 shadow-2xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Trade</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('bank')}
                            className={`px-4 py-1 rounded-full text-sm font-bold ${mode === 'bank' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >Bank</button>
                        <button
                            onClick={() => setMode('domestic')}
                            className={`px-4 py-1 rounded-full text-sm font-bold ${mode === 'domestic' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >Players</button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {mode === 'bank' ? (
                    <>
                        <div className="flex items-center justify-between gap-4 mb-8">
                            {/* Give Side */}
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center">
                                <div className="text-xs text-slate-400 uppercase mb-2">Give</div>
                                <select
                                    value={giveRes}
                                    onChange={e => setGiveRes(e.target.value as ResourceType)}
                                    className="bg-slate-700 text-white rounded p-2 w-full mb-2 text-center appearance-none cursor-pointer hover:bg-slate-600"
                                >
                                    {Object.keys(RESOURCE_ICONS).filter(r => r !== 'desert').map(r => (
                                        <option key={r} value={r}>{RESOURCE_ICONS[r as ResourceType]} {r}</option>
                                    ))}
                                </select>
                                <div className="text-sm text-slate-500">Have: {player.resources[giveRes]}</div>
                            </div>

                            <div className="text-2xl font-bold text-slate-500">➜</div>

                            {/* Get Side */}
                            <div className="flex-1 bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col items-center">
                                <div className="text-xs text-slate-400 uppercase mb-2">Get</div>
                                <select
                                    value={getRes}
                                    onChange={e => setGetRes(e.target.value as ResourceType)}
                                    className="bg-slate-700 text-white rounded p-2 w-full mb-2 text-center appearance-none cursor-pointer hover:bg-slate-600"
                                >
                                    {Object.keys(RESOURCE_ICONS).filter(r => r !== 'desert').map(r => (
                                        <option key={r} value={r}>{RESOURCE_ICONS[r as ResourceType]} {r}</option>
                                    ))}
                                </select>
                                <div className="text-sm text-slate-500">Have: {player.resources[getRes]}</div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-4 rounded-lg mb-6 text-center">
                            <div className="text-slate-400 mb-1">Exchange Rate</div>
                            <div className="text-3xl font-bold text-white">
                                {ratio} : 1
                            </div>
                            {ratio < 4 && <div className="text-xs text-green-400 mt-1">Port Bonus Active!</div>}
                        </div>

                        <button
                            onClick={handleBankTrade}
                            disabled={!canAffordBank || giveRes === getRes || isPending}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {isPending ? 'Trading...' : `Trade ${ratio} ${giveRes} for 1 ${getRes}`}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            {/* Offer Give */}
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <h3 className="text-center text-slate-300 mb-4 font-bold">You Give</h3>
                                <div className="space-y-2">
                                    {Object.keys(RESOURCE_ICONS).filter(r => r !== 'desert').map(r => {
                                        const res = r as ResourceType;
                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span>{RESOURCE_ICONS[res]}</span>
                                                    <span className="text-sm capitalize">{res}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateOffer('give', res, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600">-</button>
                                                    <span className="w-4 text-center">{offerGive[res]}</span>
                                                    <button onClick={() => updateOffer('give', res, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600" disabled={offerGive[res] >= player.resources[res]}>+</button>
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
                                    {Object.keys(RESOURCE_ICONS).filter(r => r !== 'desert').map(r => {
                                        const res = r as ResourceType;
                                        return (
                                            <div key={res} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span>{RESOURCE_ICONS[res]}</span>
                                                    <span className="text-sm capitalize">{res}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateOffer('get', res, -1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600">-</button>
                                                    <span className="w-4 text-center">{offerGet[res]}</span>
                                                    <button onClick={() => updateOffer('get', res, 1)} className="w-6 h-6 bg-slate-700 rounded hover:bg-slate-600">+</button>
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
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {isPending ? 'Offering...' : 'Offer Trade 🤝'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
