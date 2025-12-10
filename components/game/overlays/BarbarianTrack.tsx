import React from 'react';
import { GameState } from '@/lib/types';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';

interface BarbarianTrackProps {
    gameState: GameState;
}

export const BarbarianTrack: React.FC<BarbarianTrackProps> = ({ gameState }) => {
    // Only show in C&K mode
    if (gameState.gameMode !== 'cities_and_knights') {
        return null;
    }

    const barbarianPosition = gameState.barbarianPosition ?? 0;

    // Calculate total cities and knight strength
    const totalCities = gameState.players.reduce((sum, player) => {
        return sum + (4 - player.citiesRemaining);
    }, 0);

    const totalKnightStrength = gameState.players.reduce((sum, player) => {
        return sum + (player.activeKnightCount ?? 0);
    }, 0);

    const defendersWinning = totalKnightStrength >= totalCities;

    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Barbarian Attack
                </h3>
                <div className="text-xs text-slate-400">
                    Position: <span className="text-white font-bold">{barbarianPosition}</span>/7
                </div>
            </div>

            {/* Progress Track */}
            <div className="flex gap-1 mb-4">
                {Array.from({ length: 8 }, (_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${i === barbarianPosition
                                ? 'bg-red-600 text-white ring-2 ring-red-400'
                                : i < barbarianPosition
                                    ? 'bg-red-900/40 text-slate-600'
                                    : 'bg-slate-700 text-slate-500'
                            }`}
                    >
                        {i === CK_CONSTANTS.BARBARIAN_ATTACK_POSITION ? '⚔️' : i}
                    </div>
                ))}
            </div>

            {/* Defense Status */}
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-900/50 p-2 rounded">
                    <div className="text-xs text-slate-400 mb-1">Cities (Target)</div>
                    <div className="text-xl font-bold text-blue-400">{totalCities}</div>
                </div>
                <div className="bg-slate-900/50 p-2 rounded">
                    <div className="text-xs text-slate-400 mb-1">Knight Strength</div>
                    <div className={`text-xl font-bold ${defendersWinning ? 'text-green-400' : 'text-red-400'}`}>
                        {totalKnightStrength}
                    </div>
                </div>
            </div>

            {/* Status Message */}
            <div className="mt-3 text-center text-xs">
                {(barbarianPosition === CK_CONSTANTS.BARBARIAN_ATTACK_POSITION || gameState.phase === 'barbarian_city_selection') ? (
                    <span className="text-red-400 font-bold">⚔️ Barbarians Attack!</span>
                ) : barbarianPosition === CK_CONSTANTS.BARBARIAN_ATTACK_POSITION - 1 ? (
                    <span className="text-orange-400 font-bold">⚠️ ATTACK IMMINENT!</span>
                ) : defendersWinning ? (
                    <span className="text-green-400">✓ Defenders winning</span>
                ) : (
                    <span className="text-red-400">✗ Defenders losing</span>
                )}
            </div>
        </div>
    );
};
