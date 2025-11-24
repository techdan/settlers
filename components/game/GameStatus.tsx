import React from 'react';
import { GameState, PlayerState } from '@/lib/game-types';

interface GameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentPlayerId }) => {
    const getPlayerStats = (player: PlayerState) => {
        const resourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
        const devCardCount = Object.values(player.devCards).reduce((a, b) => a + b, 0);
        return { resourceCount, devCardCount };
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
                                <div className="text-xl font-bold text-white">{player.victoryPoints} VP</div>
                            </div>

                            <div className="grid grid-cols-5 gap-1 text-[10px] text-slate-400 border-t border-slate-700 pt-2">
                                <div className="flex flex-col items-center" title="Settlements (1 VP each)">
                                    <span className="text-white font-bold">{5 - player.settlementsRemaining}</span>
                                    <span>Set</span>
                                </div>
                                <div className="flex flex-col items-center" title="Cities (2 VP each)">
                                    <span className="text-white font-bold">{4 - player.citiesRemaining}</span>
                                    <span>Cit</span>
                                </div>
                                <div className="flex flex-col items-center" title="Longest Road (2 VP)">
                                    <span className={`font-bold ${gameState.longestRoadOwner === player.id ? 'text-orange-400' : 'text-slate-600'}`}>
                                        {gameState.longestRoadOwner === player.id ? '2' : '-'}
                                    </span>
                                    <span className={gameState.longestRoadOwner === player.id ? 'text-orange-400' : ''}>LR</span>
                                </div>
                                <div className="flex flex-col items-center" title="Largest Army (2 VP)">
                                    <span className="text-slate-600">-</span>
                                    <span>LA</span>
                                </div>
                                <div className="flex flex-col items-center" title="Dev Cards / Resources">
                                    <span className="text-white font-bold">{stats.devCardCount}/{stats.resourceCount}</span>
                                    <span>Dev/Res</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
