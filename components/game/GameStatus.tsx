import React from 'react';
import { GameState, PlayerState } from '@/lib/game-types';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
import { GAME_CONSTANTS } from '@/core/rules/constants';

interface GameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentPlayerId }) => {
    const getPlayerStats = (player: PlayerState) => {
        const resourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
        const devCardCount = Object.values(player.devCards).reduce((a, b) => a + b, 0);
        const longestRoad = calculateLongestRoad(gameState, player.id);
        return { resourceCount, devCardCount, longestRoad };
    };

    const getVPBreakdown = (player: PlayerState) => {
        const settlements = 5 - player.settlementsRemaining;
        const cities = 4 - player.citiesRemaining;
        const settlementVP = settlements * GAME_CONSTANTS.VP_FROM_SETTLEMENT;
        const cityVP = cities * GAME_CONSTANTS.VP_FROM_CITY;
        const roadVP = gameState.longestRoadOwner === player.id ? GAME_CONSTANTS.VP_FROM_LONGEST_ROAD : 0;
        const armyVP = gameState.largestArmyOwner === player.id ? GAME_CONSTANTS.VP_FROM_LARGEST_ARMY : 0;
        const totalPublicVP = settlementVP + cityVP + roadVP + armyVP;
        const vpCards = player.victoryPoints - totalPublicVP;

        const parts = [
            `${settlements} Settlements (${settlementVP} VP)`,
            `${cities} Cities (${cityVP} VP)`,
        ];

        if (roadVP > 0) parts.push(`Longest Road (${roadVP} VP)`);
        if (armyVP > 0) parts.push(`Largest Army (${armyVP} VP)`);
        if (vpCards > 0) parts.push(`VP Cards (${vpCards} VP)`);

        return parts.join('\n');
    };

    return (
        <div className="bg-slate-900/90 p-4 rounded-lg text-white border border-slate-700 shadow-xl backdrop-blur-sm flex flex-col gap-4">
            {/* Header */}
            <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phase</div>
                <div className="text-lg font-bold capitalize text-blue-200">
                    {gameState.phase.replace(/_/g, ' ')}
                </div>
            </div>

            {/* Player List */}
            <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-1">Players</div>
                {gameState.players.map(player => {
                    const isTurn = gameState.currentTurn === player.id;
                    const isMe = currentPlayerId === player.id;
                    const stats = getPlayerStats(player);

                    return (
                        <div
                            key={player.id}
                            className={`flex flex-col p-2 rounded gap-2 ${isTurn ? 'bg-slate-800 ring-1 ring-yellow-500/50' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full shadow-sm"
                                        style={{ backgroundColor: player.color }}
                                    />
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${isMe ? 'text-yellow-200' : 'text-slate-200'}`}>
                                            {player.name} {isMe && '(You)'}
                                        </span>
                                        {isTurn && <span className="text-[10px] text-green-400 uppercase font-bold tracking-wide">Current Turn</span>}
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-white cursor-help" title={getVPBreakdown(player)}>
                                    {player.victoryPoints} VP
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 border-t border-slate-700 pt-2">
                                <div className="flex flex-col items-center" title="Number of Resource Cards">
                                    <span className="text-white font-bold">{stats.resourceCount}</span>
                                    <span>Res</span>
                                </div>
                                <div className="flex flex-col items-center" title="Number of Development Cards">
                                    <span className="text-white font-bold">{stats.devCardCount}</span>
                                    <span>Dev</span>
                                </div>
                                <div className="flex flex-col items-center" title={`Total Consecutive Roads${gameState.longestRoadOwner === player.id ? ' (Longest Road: 2 VP)' : ''}`}>
                                    <span className={`font-bold ${gameState.longestRoadOwner === player.id ? 'text-orange-400' : 'text-white'}`}>
                                        {stats.longestRoad}
                                    </span>
                                    <span className={gameState.longestRoadOwner === player.id ? 'text-orange-400' : ''}>Roads</span>
                                </div>
                                <div className="flex flex-col items-center" title={`Total Knight cards used${gameState.largestArmyOwner === player.id ? ' (Largest Army: 2 VP)' : ''}`}>
                                    <span className={`font-bold ${gameState.largestArmyOwner === player.id ? 'text-purple-400' : 'text-white'}`}>
                                        {player.knightsPlayed || 0}
                                    </span>
                                    <span className={gameState.largestArmyOwner === player.id ? 'text-purple-400' : ''}>Army</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
