import React, { useTransition } from 'react';
import { GameState } from '@/lib/game-types';
import { buyDevCard, rollDice, endTurn } from '@/app/actions';

interface TurnControlsProps {
    gameState: GameState;
    playerId: string;
    onOpenDevCards: () => void;
    onOpenTrade: () => void;
    buildMode: 'road' | 'settlement' | 'city' | null;
    onSetBuildMode: (mode: 'road' | 'settlement' | 'city' | null) => void;
}

export const TurnControls: React.FC<TurnControlsProps> = ({
    gameState,
    playerId,
    onOpenDevCards,
    onOpenTrade,
    buildMode,
    onSetBuildMode
}) => {
    const isMyTurn = gameState.currentTurn === playerId;
    const [isPending, startTransition] = useTransition();

    const player = gameState.players.find(p => p.id === playerId);
    const resources = player?.resources || { brick: 0, wood: 0, sheep: 0, wheat: 0, ore: 0 };

    const canAffordRoad = resources.brick >= 1 && resources.wood >= 1;
    const canAffordSettlement = resources.brick >= 1 && resources.wood >= 1 && resources.sheep >= 1 && resources.wheat >= 1;
    const canAffordCity = resources.ore >= 3 && resources.wheat >= 2;
    const canAffordDevCard = resources.sheep >= 1 && resources.wheat >= 1 && resources.ore >= 1;
    const deckSize = gameState.devCardDeck.length;

    const handleRollDice = () => {
        startTransition(async () => {
            try {
                await rollDice(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to roll dice", e);
            }
        });
    };

    const handleEndTurn = () => {
        startTransition(async () => {
            try {
                await endTurn(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to end turn", e);
            }
        });
    };

    const handleBuyDevCard = () => {
        startTransition(async () => {
            try {
                await buyDevCard(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to buy dev card", e);
            }
        });
    };

    return (
        <div className="flex flex-col items-center gap-4 pointer-events-auto">
            {/* Dice Display */}
            {gameState.diceRoll && (
                <div className="bg-black/60 p-3 rounded-lg text-white flex items-center gap-4 backdrop-blur-sm border border-white/10">
                    <div className="flex gap-2">
                        <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                            {gameState.diceRoll.d1}
                        </div>
                        <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center font-bold text-xl shadow-lg">
                            {gameState.diceRoll.d2}
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                        {gameState.diceRoll.total}
                    </div>
                </div>
            )}

            {/* Controls */}
            {isMyTurn && (
                <div className="flex flex-col gap-2 items-center">
                    {gameState.phase === 'waiting_for_roll' && (
                        <button
                            onClick={handleRollDice}
                            disabled={isPending}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            {isPending ? 'Rolling...' : 'Roll Dice 🎲'}
                        </button>
                    )}

                    {gameState.phase === 'main_phase' && (
                        <>
                            {/* Build Controls */}
                            <div className="flex gap-2 bg-slate-800/80 p-2 rounded-xl backdrop-blur-sm border border-slate-700">
                                <button
                                    onClick={() => onSetBuildMode(buildMode === 'road' ? null : 'road')}
                                    disabled={!canAffordRoad}
                                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'road'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : canAffordRoad
                                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Road 🛣️</span>
                                    <span className="text-xs font-normal opacity-80">1🧱 1🌲</span>
                                </button>
                                <button
                                    onClick={() => onSetBuildMode(buildMode === 'settlement' ? null : 'settlement')}
                                    disabled={!canAffordSettlement}
                                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'settlement'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : canAffordSettlement
                                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Settlement 🏠</span>
                                    <span className="text-xs font-normal opacity-80">1🧱 1🌲 1🐑 1🌾</span>
                                </button>
                                <button
                                    onClick={() => onSetBuildMode(buildMode === 'city' ? null : 'city')}
                                    disabled={!canAffordCity}
                                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'city'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : canAffordCity
                                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span>City 🏙️</span>
                                    <span className="text-xs font-normal opacity-80">3🪨 2🌾</span>
                                </button>
                                <button
                                    onClick={handleBuyDevCard}
                                    disabled={!canAffordDevCard || deckSize === 0 || isPending}
                                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${canAffordDevCard && deckSize > 0
                                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Dev Card 🃏</span>
                                    <span className="text-xs font-normal opacity-80">1🐑 1🌾 1🪨</span>
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={onOpenTrade}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-full shadow-lg transform transition hover:scale-105"
                                >
                                    ⚖️ Trade
                                </button>
                                <button
                                    onClick={handleEndTurn}
                                    disabled={isPending}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isPending ? 'Ending...' : 'End Turn ➡️'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
