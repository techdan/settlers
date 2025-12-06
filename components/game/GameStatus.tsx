import React from 'react';
import { createPortal } from 'react-dom';
import { GameState, PlayerState } from '@/lib/types';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { ImprovementIcon } from '@/components/ui/icons/GameIcon';
import { calculateMetropolisVP } from '@/core/engine/metropolis/metropolis-manager';

interface GameStatusProps {
    gameState: GameState;
    currentPlayerId: string;
    vpAckTimestamp?: number | null;
}

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    className?: string;
    tooltipWidthClass?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className, tooltipWidthClass }) => {
    const wrapperClass = className ? `relative inline-flex ${className}` : 'relative inline-flex';
    const widthClass = tooltipWidthClass ?? 'min-w-[14rem] max-w-[26rem]';
    const [visible, setVisible] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);
    const triggerRef = React.useRef<HTMLDivElement | null>(null);
    const tooltipRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const updatePosition = React.useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const tooltipWidth = tooltip?.offsetWidth ?? 260;

        const margin = 8;
        let left = rect.left - tooltipWidth - margin;

        // If not enough room on the left, place on the right; clamp to viewport
        if (left < margin) {
            left = rect.right + margin;
        }
        if (left + tooltipWidth > window.innerWidth - margin) {
            left = Math.max(margin, window.innerWidth - tooltipWidth - margin);
        }

        const top = rect.top + rect.height / 2;
        setCoords({ top, left, width: tooltipWidth });
    }, []);

    React.useEffect(() => {
        if (!visible) return;
        updatePosition();
        const handle = () => updatePosition();
        window.addEventListener('scroll', handle, true);
        window.addEventListener('resize', handle);
        return () => {
            window.removeEventListener('scroll', handle, true);
            window.removeEventListener('resize', handle);
        };
    }, [visible, updatePosition]);

    const handleShow = () => {
        setVisible(true);
        requestAnimationFrame(updatePosition);
    };

    const handleHide = () => setVisible(false);

    const portalContent =
        mounted && visible && coords
            ? createPortal(
                  <div
                      ref={tooltipRef}
                      role="tooltip"
                      style={{
                          position: 'fixed',
                          top: coords.top,
                          left: coords.left,
                          transform: 'translateY(-50%)',
                          zIndex: 9999,
                          pointerEvents: 'none',
                      }}
                      className={`rounded-md border border-slate-700 bg-slate-950/90 px-3 py-1 text-[11px] leading-tight text-slate-100 shadow-lg ${widthClass}`}
                  >
                      <span className="whitespace-pre-line">{text}</span>
                  </div>,
                  document.body
              )
            : null;

    return (
        <div
            ref={triggerRef}
            className={wrapperClass}
            onMouseEnter={handleShow}
            onMouseLeave={handleHide}
            onFocus={handleShow}
            onBlur={handleHide}
        >
            {children}
            {portalContent}
        </div>
    );
};

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, currentPlayerId, vpAckTimestamp }) => {
    const [vpHighlightExpiry, setVpHighlightExpiry] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!gameState.lastVPCardGain || !vpAckTimestamp) {
            setVpHighlightExpiry(null);
            return;
        }

        const expiry = vpAckTimestamp + 5000;
        setVpHighlightExpiry(expiry);

        const timeout = setTimeout(() => {
            setVpHighlightExpiry(null);
        }, Math.max(0, expiry - Date.now()));

        return () => clearTimeout(timeout);
    }, [gameState.lastVPCardGain?.timestamp, vpAckTimestamp]);

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
            // C&K: Metropolises
            const metropolisVP = calculateMetropolisVP(player);
            if (metropolisVP > 0) {
                const metropolisNames: string[] = [];
                if (player.metropolisOwned?.includes('science')) metropolisNames.push('Science');
                if (player.metropolisOwned?.includes('trade')) metropolisNames.push('Trade');
                if (player.metropolisOwned?.includes('politics')) metropolisNames.push('Politics');
                const metropolisText = metropolisNames.length > 0 ? ` (${metropolisNames.join(', ')})` : '';
                parts.push(`Metropolis${metropolisText} (${metropolisVP} VP)`);
            }

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
        <div className="bg-slate-900/90 p-4 rounded-lg text-white border border-slate-700 shadow-xl backdrop-blur-sm flex flex-col gap-4 overflow-visible">
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
                    const hasVPProgressCards = !!(player.revealedVPCards && player.revealedVPCards.length > 0);
                    const vpCardGainActive =
                        gameState.lastVPCardGain &&
                        gameState.lastVPCardGain.playerId === player.id &&
                        vpHighlightExpiry !== null &&
                        Date.now() < vpHighlightExpiry;

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
                                <Tooltip text={getVPBreakdown(player)} className="text-xl font-bold text-white cursor-help">
                                    {player.victoryPoints} VP
                                </Tooltip>
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
                                    const tooltipText = `Total number of Resource and Commodity cards in hand.\nSafe Limit: ${safeLimit} cards${isDanger ? '\n⚠️ DANGER: Robber will steal half your cards on a 7!' : ''}`;

                                    return (
                                        <Tooltip text={tooltipText} className="flex flex-col items-center cursor-help">
                                            <span className={`font-bold ${isDanger ? 'text-red-500' : 'text-white'}`}>{stats.resourceCount}</span>
                                            <span className={isDanger ? 'text-red-500' : ''}>Res</span>
                                        </Tooltip>
                                    );
                                })()}
                                {gameState.gameMode !== 'cities_and_knights' ? (
                                    <Tooltip text="Total number of Development Cards in hand." className="flex flex-col items-center cursor-help">
                                        <span className="text-white font-bold">{stats.devCardCount}</span>
                                        <span>Dev</span>
                                    </Tooltip>
                                ) : (
                                    <Tooltip text="Total number of Progress Cards in hand." className="flex flex-col items-center cursor-help">
                                        <span className="text-white font-bold">{stats.progressCardCount}</span>
                                        <span>Prog</span>
                                    </Tooltip>
                                )}
                                <Tooltip
                                    text={`Current length of continuous road.\nLongest Road (>=5) grants 2 VP.${gameState.longestRoadOwner === player.id ? '\n(Currently holds Longest Road)' : ''}`}
                                    className="flex flex-col items-center cursor-help"
                                >
                                    <span className={`font-bold ${gameState.longestRoadOwner === player.id ? 'text-orange-400' : 'text-white'}`}>
                                        {stats.longestRoad}
                                    </span>
                                    <span className={gameState.longestRoadOwner === player.id ? 'text-orange-400' : ''}>Roads</span>
                                </Tooltip>

                                {/* Show Army for base game, Defense for C&K */}
                                {gameState.gameMode !== 'cities_and_knights' ? (
                                    <Tooltip
                                        text={`Total Knight cards played.\nLargest Army (>=3) grants 2 VP.${gameState.largestArmyOwner === player.id ? '\n(Currently holds Largest Army)' : ''}`}
                                        className="flex flex-col items-center cursor-help"
                                    >
                                        <span className={`font-bold ${gameState.largestArmyOwner === player.id ? 'text-purple-400' : 'text-white'}`}>
                                            {player.knightsPlayed || 0}
                                        </span>
                                        <span className={gameState.largestArmyOwner === player.id ? 'text-purple-400' : ''}>Army</span>
                                    </Tooltip>
                                ) : (
                                    <Tooltip
                                        text="Total active Knight strength.\nUsed to defend Catan against the Barbarian attack."
                                        className="flex flex-col items-center cursor-help"
                                    >
                                        <span className="text-white font-bold">
                                            {player.activeKnightCount || 0}
                                        </span>
                                        <span>Defense</span>
                                    </Tooltip>
                                )}
                            </div>

                            {/* C&K: VP Cards, Merchant, and City Status */}
                            {gameState.gameMode === 'cities_and_knights' && (
                                <div className="flex flex-col gap-2 border-t border-slate-700 pt-2">
                                    {/* VP & Special Tokens */}
                                    <div className="flex gap-2 items-center text-xs flex-wrap">
                                        {/* Defender of Catan Tokens */}
                                        <Tooltip
                                            text={`Defender of Catan Tokens.\nEarned by contributing the most knights to defend Catan.\nEach token is worth 1 VP.`}
                                            className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${player.defenderVPTokens > 0 ? 'bg-blue-900/30' : 'bg-slate-800/30 opacity-50'}`}
                                        >
                                            <span className="text-blue-400">🛡️</span>
                                            <span className={`font-bold ${player.defenderVPTokens > 0 ? 'text-blue-200' : 'text-slate-400'}`}>{player.defenderVPTokens} VP</span>
                                        </Tooltip>

                                        {/* VP Progress Cards */}
                                        <Tooltip
                                            text={`Victory Point Progress Cards (e.g., Printer, Constitution).\nEach card is worth 1 VP.\nCurrent: ${player.revealedVPCards?.join(', ') || 'None'}`}
                                            className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${hasVPProgressCards ? 'bg-amber-900/30' : 'bg-slate-800/30 opacity-50'} ${vpCardGainActive ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                                        >
                                            <span className="text-amber-400">📜</span>
                                            <span className={`font-bold ${hasVPProgressCards ? 'text-amber-200' : 'text-slate-400'} ${vpCardGainActive ? 'text-amber-50' : ''}`}>{player.revealedVPCards?.length || 0} VP</span>
                                        </Tooltip>

                                        {/* Merchant */}
                                        <Tooltip
                                            text={`The Merchant.\nGives 1 VP and allows 2:1 trading for the resource of the hex it is placed on.`}
                                            className={`flex items-center gap-1 px-2 py-1 rounded cursor-help ${gameState.activeMerchant === player.id ? 'bg-green-900/30' : 'bg-slate-800/30 opacity-50'}`}
                                        >
                                            <span className="text-green-400">🏪</span>
                                            <span className={`font-bold ${gameState.activeMerchant === player.id ? 'text-green-200' : 'text-slate-400'}`}>{gameState.activeMerchant === player.id ? 1 : 0} VP</span>
                                        </Tooltip>
                                    </div>

                                    {/* City Improvements & Metropolises */}
                                    <div className="flex flex-col gap-1.5 mt-2">
                                        {/* Science */}
                                        <Tooltip
                                            text={`Science Improvement Track (Green).\nLevel 3 unlocks the Aqueduct ability:\nIf you produce no resources on a dice roll (except 7), you may take any one resource of your choice.`}
                                            className="cursor-help"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <ImprovementIcon
                                                    type="science"
                                                    level={player.improvements?.science || 0}
                                                    size={16}
                                                    className="flex-1"
                                                />
                                                {player.metropolisOwned?.includes('science') && (
                                                    <span className="text-xs">🏛️</span>
                                                )}
                                            </div>
                                        </Tooltip>

                                        {/* Trade */}
                                        <Tooltip
                                            text={`Trade Improvement Track (Yellow).\nLevel 3 unlocks the Trading House ability:\nYou may trade any 2 identical commodities for any 1 other commodity or resource.`}
                                            className="cursor-help"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <ImprovementIcon
                                                    type="trade"
                                                    level={player.improvements?.trade || 0}
                                                    size={16}
                                                    className="flex-1"
                                                />
                                                {player.metropolisOwned?.includes('trade') && (
                                                    <span className="text-xs">🏛️</span>
                                                )}
                                            </div>
                                        </Tooltip>

                                        {/* Politics */}
                                        <Tooltip
                                            text={`Politics Improvement Track (Blue).\nLevel 3 unlocks the Fortress ability:\nYou may promote Strong Knights to Mighty Knights.`}
                                            className="cursor-help"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <ImprovementIcon
                                                    type="politics"
                                                    level={player.improvements?.politics || 0}
                                                    size={16}
                                                    className="flex-1"
                                                />
                                                {player.metropolisOwned?.includes('politics') && (
                                                    <span className="text-xs">🏛️</span>
                                                )}
                                            </div>
                                        </Tooltip>
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
