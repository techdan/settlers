import React, { useTransition } from 'react';
import { GameState } from '@/lib/types';
import { buyDevCard } from '@/app/actions';

interface BuildControlsProps {
    gameState: GameState;
    playerId: string;
    buildMode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null;
    onSetBuildMode: (mode: 'road' | 'settlement' | 'city' | 'knight' | 'city_wall' | null) => void;
}

export const BuildControls: React.FC<BuildControlsProps> = ({
    gameState,
    playerId,
    buildMode,
    onSetBuildMode
}) => {
    const isMyTurn = gameState.currentTurn === playerId;
    const [isPending, startTransition] = useTransition();
    const isCitiesAndKnights = gameState.gameMode === 'cities_and_knights';

    const player = gameState.players.find(p => p.id === playerId);
    const resources = player?.resources || { brick: 0, wood: 0, sheep: 0, wheat: 0, ore: 0 };

    const canAffordRoad = resources.brick >= 1 && resources.wood >= 1;
    const canAffordSettlement = resources.brick >= 1 && resources.wood >= 1 && resources.sheep >= 1 && resources.wheat >= 1;
    const canAffordCity = resources.ore >= 3 && resources.wheat >= 2;
    const canAffordDevCard = resources.sheep >= 1 && resources.wheat >= 1 && resources.ore >= 1;
    const canAffordKnight = resources.sheep >= 1 && resources.ore >= 1;
    const canAffordCityWall = resources.brick >= 2;
    const deckSize = gameState.devCardDeck?.length || 0;

    const handleBuyDevCard = () => {
        startTransition(async () => {
            try {
                await buyDevCard(gameState.roomId, playerId);
            } catch (e) {
                console.error("Failed to buy dev card", e);
            }
        });
    };

    if (!isMyTurn || gameState.phase !== 'main_phase') return null;

    return (
        <div className="flex gap-2 bg-slate-800/80 p-2 rounded-xl backdrop-blur-sm border border-slate-700 pointer-events-auto">
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
                <span>Road 🛣️ ({player?.roadsRemaining ?? 0})</span>
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
                <span>Settlement 🏠 ({player?.settlementsRemaining ?? 0})</span>
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
                <span>City 🏙️ ({player?.citiesRemaining ?? 0})</span>
                <span className="text-xs font-normal opacity-80">3🪨 2🌾</span>
            </button>
            {/* Dev Card (Base Game only) */}
            {!isCitiesAndKnights && (
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
            )}

            {/* Knight (Cities & Knights only) */}
            {isCitiesAndKnights && (
                <button
                    onClick={() => onSetBuildMode(buildMode === 'knight' ? null : 'knight')}
                    disabled={!canAffordKnight}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'knight'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordKnight
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <span>Knight ⚔️</span>
                    <span className="text-xs font-normal opacity-80">1🐑 1🪨</span>
                </button>
            )}

            {/* City Wall (Cities & Knights only) */}
            {isCitiesAndKnights && (
                <button
                    onClick={() => onSetBuildMode(buildMode === 'city_wall' ? null : 'city_wall')}
                    disabled={!canAffordCityWall}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg font-bold text-sm transition-colors ${buildMode === 'city_wall'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : canAffordCityWall
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    <span>City Wall 🏰</span>
                    <span className="text-xs font-normal opacity-80">2🧱</span>
                </button>
            )}
        </div>
    );
};
