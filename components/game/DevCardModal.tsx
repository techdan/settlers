import React, { useState, useTransition } from 'react';
import { GameState, PlayerState, DevCardType } from '@/lib/game-types';
import { ResourceType } from '@/lib/board-data';
import { buyDevCard, playDevCard } from '@/app/actions';

interface DevCardModalProps {
    gameState: GameState;
    playerId: string;
    onClose: () => void;
}

const DEV_CARD_LABELS: Record<DevCardType, string> = {
    knight: 'Knight ⚔️',
    victory_point: 'Victory Point 🏆',
    road_building: 'Road Building 🛣️',
    year_of_plenty: 'Year of Plenty 🌾',
    monopoly: 'Monopoly 🎩',
};

const DEV_CARD_DESCRIPTIONS: Record<DevCardType, string> = {
    knight: 'Move the robber.',
    victory_point: '+1 Victory Point.',
    road_building: 'Place 2 roads (Get 2 Wood + 2 Brick).',
    year_of_plenty: 'Take any 2 resources.',
    monopoly: 'Steal all of one resource type from others.',
};

export const DevCardModal: React.FC<DevCardModalProps> = ({ gameState, playerId, onClose }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [isPending, startTransition] = useTransition();
    const [selectedCard, setSelectedCard] = useState<DevCardType | null>(null);

    // Options for YoP / Monopoly
    const [resource1, setResource1] = useState<ResourceType>('wood');
    const [resource2, setResource2] = useState<ResourceType>('brick');
    const [monopolyRes, setMonopolyRes] = useState<ResourceType>('ore');

    if (!player) return null;

    const canBuy = player.resources.sheep >= 1 && player.resources.wheat >= 1 && player.resources.ore >= 1;
    const deckSize = gameState.devCardDeck.length;

    const handleBuy = () => {
        startTransition(async () => {
            try {
                await buyDevCard(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to buy dev card", e);
            }
        });
    };

    const handlePlay = () => {
        if (!selectedCard) return;
        startTransition(async () => {
            try {
                await playDevCard(gameState.roomId, playerId, selectedCard, {
                    resource1,
                    resource2,
                    monopolyResource: monopolyRes
                });
                setSelectedCard(null);
            } catch (e) {
                console.error("Failed to play dev card", e);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 shadow-2xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Development Cards</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Buy Section */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-bold text-slate-200 mb-2">Buy New Card</h3>
                        <div className="text-sm text-slate-400 mb-4">Cost: 1 Sheep, 1 Wheat, 1 Ore</div>
                        <div className="text-sm text-slate-400 mb-4">Deck: {deckSize} cards left</div>

                        <button
                            onClick={handleBuy}
                            disabled={!canBuy || deckSize === 0 || isPending}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {isPending ? 'Buying...' : 'Buy Card (1🐑 1🌾 1🪨)'}
                        </button>
                    </div>

                    {/* Play Section */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-bold text-slate-200 mb-2">Your Cards</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {(Object.keys(player.devCards) as DevCardType[]).map(type => {
                                const count = player.devCards[type];
                                if (count === 0) return null;
                                return (
                                    <div
                                        key={type}
                                        onClick={() => setSelectedCard(type)}
                                        className={`p-3 rounded border cursor-pointer transition-colors flex justify-between items-center ${selectedCard === type ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                                    >
                                        <div>
                                            <div className="font-bold text-white">{DEV_CARD_LABELS[type]}</div>
                                            <div className="text-xs text-slate-400">{DEV_CARD_DESCRIPTIONS[type]}</div>
                                        </div>
                                        <div className="text-lg font-bold text-white">x{count}</div>
                                    </div>
                                );
                            })}
                            {Object.values(player.devCards).every(c => c === 0) && (
                                <div className="text-slate-500 italic text-center py-4">No cards yet</div>
                            )}
                        </div>

                        {/* Contextual Options */}
                        {selectedCard === 'year_of_plenty' && (
                            <div className="mb-4 space-y-2">
                                <div className="text-xs text-slate-400">Select 2 Resources:</div>
                                <div className="flex gap-2">
                                    <select value={resource1} onChange={e => setResource1(e.target.value as ResourceType)} className="bg-slate-700 text-white rounded p-1 text-sm w-full">
                                        {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select value={resource2} onChange={e => setResource2(e.target.value as ResourceType)} className="bg-slate-700 text-white rounded p-1 text-sm w-full">
                                        {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedCard === 'monopoly' && (
                            <div className="mb-4 space-y-2">
                                <div className="text-xs text-slate-400">Select Resource to Steal:</div>
                                <select value={monopolyRes} onChange={e => setMonopolyRes(e.target.value as ResourceType)} className="bg-slate-700 text-white rounded p-1 text-sm w-full">
                                    {['wood', 'brick', 'sheep', 'wheat', 'ore'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handlePlay}
                            disabled={!selectedCard || isPending}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            {isPending ? 'Playing...' : selectedCard ? `Play ${DEV_CARD_LABELS[selectedCard]}` : 'Select a Card to Play'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
