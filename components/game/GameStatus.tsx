import React from 'react';
import { GameState, PlayerState } from '@/lib/types';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
import { GAME_CONSTANTS } from '@/core/rules/constants';

interface GameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentPlayerId }) => {
    const getPlayerStats = (player: PlayerState) => {
        const resourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
        const devCardCount = Object.values(player.devCards).reduce((a, b) => a + b, 0) + (player.devCardsBoughtThisTurn?.length || 0);
        const progressCardCount = player.progressCards?.length || 0;
        const longestRoad = calculateLongestRoad(gameState, player.id);
        return { resourceCount, devCardCount, progressCardCount, longestRoad };
    };

    const getVPBreakdown = (player: PlayerState) => {
        const settlements = 5 - player.settlementsRemaining;
        const cities = 4 - player.citiesRemaining;
        const settlementVP = settlements * GAME_CONSTANTS.VP_FROM_SETTLEMENT;
        const cityVP = cities * GAME_CONSTANTS.VP_FROM_CITY;
        const roadVP = gameState.longestRoadOwner === player.id ? GAME_CONSTANTS.VP_FROM_LONGEST_ROAD : 0;

        const parts = [
            `${settlements} Settlements (${settlementVP} VP)`,
            `${cities} Cities (${cityVP} VP)`,
        ];

        if (roadVP > 0) parts.push(`Longest Road (${roadVP} VP)`);

        // Base game: Largest Army
        // C&K mode: Defender tokens
        if (gameState.gameMode !== 'cities_and_knights') {
            const armyVP = gameState.largestArmyOwner === player.id ? GAME_CONSTANTS.VP_FROM_LARGEST_ARMY : 0;
            if (armyVP > 0) parts.push(`Largest Army (${armyVP} VP)`);
        } else {
            // C&K: Defender tokens
            if (player.defenderVPTokens > 0) {
                parts.push(`Defender Tokens (${player.defenderVPTokens} VP)`);
            }
            // VP Progress Cards
            if (player.revealedVPCards && player.revealedVPCards.length > 0) {
                parts.push(`VP Cards (${player.revealedVPCards.length} VP)`);
            }
            // Merchant
            if (gameState.activeMerchant === player.id) {
                parts.push(`Merchant (1 VP)`);
            }
        }

        // Hidden VP cards (base game only)
        if (gameState.gameMode !== 'cities_and_knights') {
            const totalPublicVP = settlementVP + cityVP + roadVP + (gameState.largestArmyOwner === player.id ? GAME_CONSTANTS.VP_FROM_LARGEST_ARMY : 0);
            const vpCards = player.victoryPoints - totalPublicVP;
            if (vpCards > 0) parts.push(`VP Cards (${vpCards} VP)`);
        }

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
                                {(() => {
                                    // Calculate safe limit: 7 base + 2 per city wall (max 3 walls)
                                    // Count active city walls
                                    const cityWallCount = Object.values(gameState.board.vertices).filter(v =>
                                        v.owner === player.id && v.hasCityWall
                                    ).length;
                                    const safeLimit = 7 + (cityWallCount * 2);
                                    const isDanger = stats.resourceCount > safeLimit;

                                    return (
                                        <div className="flex flex-col items-center cursor-help" title={`Total number of Resource and Commodity cards in hand.\nSafe Limit: ${safeLimit} cards${isDanger ? '\n⚠️ DANGER: Robber will steal half your cards on a 7!' : ''}`}>
                                            <span className={`font-bold ${isDanger ? 'text-red-500' : 'text-white'}`}>{stats.resourceCount}</span>
                                            <span className={isDanger ? 'text-red-500' : ''}>Res</span>
                                        </div>
                                    );
                                })()}
                                {gameState.gameMode !== 'cities_and_knights' ? (
                                    <div className="flex flex-col items-center cursor-help" title="Total number of Development Cards in hand.">
                                        <span className="text-white font-bold">{stats.devCardCount}</span>
                                        <span>Dev</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center cursor-help" title="Total number of Progress Cards in hand.">
                                        <span className="text-white font-bold">{stats.progressCardCount}</span>
                                        <span>Prog</span>
                                    </div>
                                )}
                                <div className="flex flex-col items-center cursor-help" title={`Current length of continuous road.\nLongest Road (>=5) grants 2 VP.${gameState.longestRoadOwner === player.id ? '\n(Currently holds Longest Road)' : ''}`}>
                                    <span className={`font-bold ${gameState.longestRoadOwner === player.id ? 'text-orange-400' : 'text-white'}`}>
                                        {stats.longestRoad}
                                    </span>
                                    <span className={gameState.longestRoadOwner === player.id ? 'text-orange-400' : ''}>Roads</span>
                                </div>

                                {/* Show Army for base game, Defense for C&K */}
                                {gameState.gameMode !== 'cities_and_knights' ? (
                                    <div className="flex flex-col items-center cursor-help" title={`Total Knight cards played.\nLargest Army (>=3) grants 2 VP.${gameState.largestArmyOwner === player.id ? '\n(Currently holds Largest Army)' : ''}`}>
                                        <span className={`font-bold ${gameState.largestArmyOwner === player.id ? 'text-purple-400' : 'text-white'}`}>
                                            {player.knightsPlayed || 0}
                                        </span>
                                        <span className={gameState.largestArmyOwner === player.id ? 'text-purple-400' : ''}>Army</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center cursor-help" title="Total active Knight strength.\nUsed to defend Catan against the Barbarian attack.">
                                        <span className="text-white font-bold">
                                            {player.activeKnightCount || 0}
                                        </span>
                                        <span>Defense</span>
                                    </div>
                                )}
                            </div>

                            {/* C&K: VP Cards, Merchant, and City Status */}
                            {gameState.gameMode === 'cities_and_knights' && (
                                <div className="flex flex-col gap-2 border-t border-slate-700 pt-2">
                                    {/* VP & Special Tokens */}
                                    <div className="flex gap-2 items-center text-xs flex-wrap">
                                        {/* Defender of Catan Tokens */}
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${player.defenderVPTokens > 0 ? 'bg-blue-900/30' : 'bg-slate-800/30 opacity-50'}`} title={`Defender of Catan Tokens.\nEarned by contributing the most knights to defend Catan.\nEach token is worth 1 VP.`}>
                                            <span className="text-blue-400">🛡️</span>
                                            <span className={`font-bold ${player.defenderVPTokens > 0 ? 'text-blue-200' : 'text-slate-400'}`}>{player.defenderVPTokens} VP</span>
                                        </div>

                                        {/* VP Progress Cards */}
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${player.revealedVPCards && player.revealedVPCards.length > 0 ? 'bg-amber-900/30' : 'bg-slate-800/30 opacity-50'}`} title={`Victory Point Progress Cards (e.g., Printer, Constitution).\nEach card is worth 1 VP.\nCurrent: ${player.revealedVPCards?.join(', ') || 'None'}`}>
                                            <span className="text-amber-400">📜</span>
                                            <span className={`font-bold ${player.revealedVPCards && player.revealedVPCards.length > 0 ? 'text-amber-200' : 'text-slate-400'}`}>{player.revealedVPCards?.length || 0} VP</span>
                                        </div>

                                        {/* Merchant */}
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${gameState.activeMerchant === player.id ? 'bg-green-900/30' : 'bg-slate-800/30 opacity-50'}`} title={`The Merchant.\nGives 1 VP and allows 2:1 trading for the resource of the hex it is placed on.`}>
                                            <span className="text-green-400">🏪</span>
                                            <span className={`font-bold ${gameState.activeMerchant === player.id ? 'text-green-200' : 'text-slate-400'}`}>{gameState.activeMerchant === player.id ? 1 : 0} VP</span>
                                        </div>
                                    </div>

                                    {/* City Improvements & Metropolises */}
                                    <div className="grid grid-cols-3 gap-1">
                                        {/* Science */}
                                        <div className="flex items-center gap-1 bg-green-900/20 p-1 rounded cursor-help" title={`Science Improvement Track (Green).\nLevel 3 unlocks the Aqueduct ability:\nIf you produce no resources on a dice roll (except 7), you may take any one resource of your choice.`}>
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-[10px] text-green-200">{player.improvements?.science || 0}</span>
                                            {player.metropolisOwned?.includes('science') && (
                                                <span className="text-[10px]" title="Science Metropolis (+2 VP). You have the highest level in Science (at least level 4).">🏛️</span>
                                            )}
                                        </div>
                                        {/* Trade */}
                                        <div className="flex items-center gap-1 bg-yellow-900/20 p-1 rounded cursor-help" title={`Trade Improvement Track (Yellow).\nLevel 3 unlocks the Trading House ability:\nYou may trade commodities (Paper, Cloth, Coin) 2:1 with the bank.`}>
                                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                            <span className="text-[10px] text-yellow-200">{player.improvements?.trade || 0}</span>
                                            {player.metropolisOwned?.includes('trade') && (
                                                <span className="text-[10px]" title="Trade Metropolis (+2 VP). You have the highest level in Trade (at least level 4).">🏛️</span>
                                            )}
                                        </div>
                                        {/* Politics */}
                                        <div className="flex items-center gap-1 bg-blue-900/20 p-1 rounded cursor-help" title={`Politics Improvement Track (Blue).\nLevel 3 unlocks the Fortress ability:\nYou may promote Strong Knights to Mighty Knights.`}>
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-[10px] text-blue-200">{player.improvements?.politics || 0}</span>
                                            {player.metropolisOwned?.includes('politics') && (
                                                <span className="text-[10px]" title="Politics Metropolis (+2 VP). You have the highest level in Politics (at least level 4).">🏛️</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
