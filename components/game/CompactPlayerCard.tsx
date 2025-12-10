'use client';

import React from 'react';
import { PlayerState, GameState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { CompactImprovementBar } from '@/components/ui/icons/CompactImprovementBar';
import { IMPROVEMENT_TOOLTIPS } from './CityManagementDialog';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';

interface CompactPlayerCardProps {
    player: PlayerState;
    gameState: GameState;
    isCurrentPlayer: boolean;  // Is this the local user?
    isTurn: boolean;           // Is it this player's turn?
    onOpenCityManagement?: () => void;
}

/**
 * Compact 3-row player card for the right sidebar.
 * Row 1: Identity (color, name, VP, turn indicator)
 * Row 2: Stats + Special VP indicators
 * Row 3: City improvement bars (C&K only)
 * 
 * All detailed information available via tooltips.
 */
export const CompactPlayerCard: React.FC<CompactPlayerCardProps> = ({
    player,
    gameState,
    isCurrentPlayer,
    isTurn,
    onOpenCityManagement,
}) => {
    const isCK = gameState.gameMode === 'cities_and_knights';
    const tooltipClassName = 'min-w-[12rem] max-w-[20rem] whitespace-pre-line text-xs';
    const canOpenCityManagement = isCK && isCurrentPlayer && !!onOpenCityManagement;

    // Calculate stats
    const resourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
    const commodityCount = isCK
        ? Object.values(player.commodities || {}).reduce((a, b) => a + b, 0)
        : 0;
    const totalCards = resourceCount + commodityCount;

    const progressCardCount = player.progressCards?.length || 0;
    const devCardCount = isCK
        ? 0
        : Object.values(player.devCards).reduce((a, b) => a + b, 0) + (player.devCardsBoughtThisTurn?.length || 0);

    const longestRoad = calculateLongestRoad(gameState, player.id);
    const hasLongestRoad = gameState.longestRoadOwner === player.id;

    const activeKnightStrength = player.activeKnightCount || 0;

    // City wall count for safe limit calculation
    const cityWallCount = Object.values(gameState.board.vertices).filter(
        v => v.owner === player.id && v.hasCityWall
    ).length;
    const safeLimit = 7 + (cityWallCount * 2);
    const isDanger = totalCards > safeLimit;

    // C&K special VP
    const defenderVP = player.defenderVPTokens || 0;
    const vpCardsCount = player.revealedVPCards?.length || 0;
    const hasMerchant = gameState.activeMerchant === player.id;

    // Tooltips
    const resourceTooltip = isCK
        ? `Resources: ${resourceCount}\nCommodities: ${commodityCount}\nTotal: ${totalCards}\nSafe limit: ${safeLimit}${isDanger ? '\n⚠️ Over limit - vulnerable to robber!' : ''}`
        : `Total cards: ${totalCards}\nSafe limit: ${safeLimit}${isDanger ? '\n⚠️ Over limit - vulnerable to robber!' : ''}`;

    const roadTooltip = `Road length: ${longestRoad}${hasLongestRoad ? '\n🏆 Longest Road (+2 VP)' : '\nLongest Road requires 5+'}`;

    const defenseTooltip = `Active knight strength: ${activeKnightStrength}\nUsed to defend against Barbarian attacks`;

    const cardTooltip = isCK
        ? `Progress cards: ${progressCardCount}`
        : `Development cards: ${devCardCount}`;

    const defenderTooltip = `Defender of Catan: ${defenderVP} VP\nEarned by contributing most knights to defense`;

    const vpCardTooltip = player.revealedVPCards?.length
        ? `VP Progress Cards: ${player.revealedVPCards.join(', ')}`
        : 'No VP progress cards revealed';

    const merchantTooltip = hasMerchant
        ? 'Merchant: +1 VP\n2:1 trade ratio for the hex resource'
        : 'Merchant not owned';

    // VP breakdown for tooltip
    const getVPBreakdown = () => {
        const settlements = 5 - player.settlementsRemaining;
        const cities = 4 - player.citiesRemaining;
        const parts = [
            `Settlements: ${settlements} VP`,
            `Cities: ${cities * 2} VP`,
        ];
        if (hasLongestRoad) parts.push('Longest Road: 2 VP');
        if (isCK) {
            if (defenderVP > 0) parts.push(`Defender: ${defenderVP} VP`);
            if (vpCardsCount > 0) parts.push(`VP Cards: ${vpCardsCount} VP`);
            if (hasMerchant) parts.push('Merchant: 1 VP');
            const metropolisCount = player.metropolisOwned?.length || 0;
            if (metropolisCount > 0) parts.push(`Metropolis: ${metropolisCount * 2} VP`);
        } else {
            if (gameState.largestArmyOwner === player.id) parts.push('Largest Army: 2 VP');
        }
        return parts.join('\n');
    };

    return (
        <div
            className={`
                flex flex-col gap-1 p-2 rounded-lg transition-all
                ${isTurn
                    ? 'bg-slate-800/90 ring-1 ring-yellow-500/50 shadow-lg'
                    : 'bg-slate-800/50'
                }
            `}
        >
            {/* Row 1: Identity */}
            <div className="flex items-center gap-2">
                {/* Color dot */}
                <div
                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                />

                {/* Name */}
                <span
                    className={`
                        text-sm font-semibold truncate flex-1
                        ${isCurrentPlayer ? 'text-yellow-200' : 'text-slate-200'}
                    `}
                    title={player.name}
                >
                    {player.name}
                    {isCurrentPlayer && <span className="text-xs text-slate-400 ml-1">(You)</span>}
                </span>

                {/* VP */}
                <Tooltip
                    content={getVPBreakdown()}
                    className="cursor-default"
                    tooltipClassName={tooltipClassName}
                    placement="left"
                >
                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                        {player.victoryPoints}
                    </span>
                </Tooltip>

                {/* Turn indicator */}
                {isTurn && (
                    <span className="text-sm" title="Current turn">🏴</span>
                )}
            </div>

            {/* Row 2: Stats + Special VP */}
            <div className="flex items-center gap-1 text-[12px] leading-tight text-slate-300">
                {/* Basic stats */}
                <div className="flex items-center gap-1">
                    {/* Resources */}
                    <Tooltip
                        content={resourceTooltip}
                        className="cursor-default"
                        tooltipClassName={tooltipClassName}
                        placement="bottom"
                    >
                        <span className={`flex items-center gap-1 ${isDanger ? 'text-red-400' : ''}`}>
                            <span>📦</span>
                            <span className="font-bold tabular-nums">{totalCards}</span>
                        </span>
                    </Tooltip>

                    {/* Cards (Dev or Progress) */}
                    <Tooltip
                        content={cardTooltip}
                        className="cursor-default"
                        tooltipClassName={tooltipClassName}
                        placement="bottom"
                    >
                        <span className="flex items-center gap-1">
                            <span>📜</span>
                            <span className="font-bold tabular-nums">{isCK ? progressCardCount : devCardCount}</span>
                        </span>
                    </Tooltip>

                    {/* Roads */}
                    <Tooltip
                        content={roadTooltip}
                        className="cursor-default"
                        tooltipClassName={tooltipClassName}
                        placement="bottom"
                    >
                        <span className={`flex items-center gap-1 ${hasLongestRoad ? 'text-orange-400' : ''}`}>
                            <span>🛤</span>
                            <span className="font-bold tabular-nums">{longestRoad}</span>
                        </span>
                    </Tooltip>

                    {/* Defense (C&K) or Army (base) */}
                    {isCK ? (
                        <Tooltip
                            content={defenseTooltip}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className="flex items-center gap-1">
                                <span>⚔</span>
                                <span className="font-bold tabular-nums">{activeKnightStrength}</span>
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            content={`Knights played: ${player.knightsPlayed || 0}${gameState.largestArmyOwner === player.id ? '\n🏆 Largest Army (+2 VP)' : ''}`}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className={`flex items-center gap-1 ${gameState.largestArmyOwner === player.id ? 'text-purple-400' : ''}`}>
                                <span>⚔</span>
                                <span className="font-bold tabular-nums">{player.knightsPlayed || 0}</span>
                            </span>
                        </Tooltip>
                    )}
                </div>

                {/* Divider for special VP */}
                {isCK && <span className="text-slate-600 mx-0.5">│</span>}

                {/* Special VP (C&K only) - moved from row 3 to row 2 */}
                {isCK && (
                    <div className="flex items-center gap-1.5">
                        {/* Defender VP */}
                        <Tooltip
                            content={defenderTooltip}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className={`flex items-center gap-1 ${defenderVP > 0 ? 'text-blue-300' : 'text-slate-500'}`}>
                                <span>🛡</span>
                                <span className="font-bold tabular-nums">{defenderVP}</span>
                            </span>
                        </Tooltip>

                        {/* VP Cards */}
                        <Tooltip
                            content={vpCardTooltip}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className={`flex items-center gap-1 ${vpCardsCount > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                                <span>🏆</span>
                                <span className="font-bold tabular-nums">{vpCardsCount}</span>
                            </span>
                        </Tooltip>

                        {/* Merchant */}
                        <Tooltip
                            content={merchantTooltip}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className={`${hasMerchant ? 'text-green-400' : 'text-slate-500'}`}>
                                🏪{hasMerchant ? '●' : '-'}
                            </span>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Row 3: City Improvement bars (C&K only) - on their own row */}
            {isCK && (
                <div className="flex items-center gap-1.5 mt-0.5 text-[12px] leading-tight">
                    {([
                        { type: 'science', label: 'S', color: 'var(--color-improvement-science-alt)' },
                        { type: 'trade', label: 'T', color: 'var(--color-improvement-trade-alt)' },
                        { type: 'politics', label: 'P', color: 'var(--color-improvement-politics-alt)' },
                    ] as const).map(({ type, label, color }) => (
                        <Tooltip
                            key={type}
                            content={IMPROVEMENT_TOOLTIPS[type]}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <button
                                type="button"
                                onClick={() => canOpenCityManagement && onOpenCityManagement?.()}
                                className={`flex items-center gap-1 focus:outline-none rounded px-0.5 py-0.5 transition ${
                                    canOpenCityManagement ? 'hover:bg-slate-700/60 cursor-pointer' : 'cursor-default'
                                }`}
                            >
                                <span className="font-bold" style={{ color }}>{label}</span>
                                <div className="scale-[0.85] origin-left">
                                    <CompactImprovementBar
                                        type={type}
                                        level={player.improvements?.[type] || 0}
                                        hasMetropolis={player.metropolisOwned?.includes(type)}
                                        size="md"
                                    />
                                </div>
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
};
