'use client';

import React from 'react';
import { PlayerState, GameState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { CompactImprovementBar } from '@/components/ui/icons/CompactImprovementBar';
import { IMPROVEMENT_TOOLTIPS } from '../city/CityManagementDialog';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { calculatePublicVictoryPoints } from '@/core/rules/victory-conditions';

interface CompactPlayerCardProps {
    player: PlayerState;
    gameState: GameState;
    isCurrentPlayer: boolean;  // Is this the local user?
    isTurn: boolean;           // Is it this player's turn?
    onOpenCityManagement?: () => void;
}

/* Stat glyphs — drawn, fill=currentColor so each stat's semantic tint
 * (danger red, longest-road orange, …) colors the icon along with the number. */
const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="currentColor" aria-hidden="true" className="flex-shrink-0">
        {children}
    </svg>
);
const HandGlyph = () => (
    <G>
        <rect x={1.6} y={2.6} width={7} height={10} rx={1.2} opacity={0.55} transform="rotate(-9 5.1 7.6)" />
        <rect x={5.2} y={1.9} width={7} height={10.3} rx={1.2} transform="rotate(8 8.7 7)" />
    </G>
);
const ScrollGlyph = () => (
    <G>
        <rect x={2.6} y={3.2} width={8.8} height={7.6} rx={0.8} opacity={0.85} />
        <rect x={1} y={2.3} width={2.2} height={9.4} rx={1.1} />
        <rect x={10.8} y={2.3} width={2.2} height={9.4} rx={1.1} />
    </G>
);
const RoadGlyph = () => (
    <G>
        <rect x={0.8} y={5} width={12.4} height={4.2} rx={2.1} />
        <rect x={2} y={5.9} width={10} height={1.1} rx={0.55} fill="#ffffff" opacity={0.35} />
    </G>
);
const ShieldFillGlyph = () => (
    <G>
        <path d="M 7 1.2 L 12 3 L 12 7.2 Q 12 10.6 7 12.8 Q 2 10.6 2 7.2 L 2 3 Z" />
    </G>
);
const ShieldLineGlyph = () => (
    <G>
        <path d="M 7 1.8 L 11.4 3.4 L 11.4 7.1 Q 11.4 9.9 7 11.9 Q 2.6 9.9 2.6 7.1 L 2.6 3.4 Z" fill="none" stroke="currentColor" strokeWidth={1.6} />
    </G>
);
const StarGlyph = () => (
    <G>
        <polygon points="7,0.8 8.7,5.1 13.2,5.1 9.6,7.9 10.9,12.3 7,9.6 3.1,12.3 4.4,7.9 0.8,5.1 5.3,5.1" />
    </G>
);
const HatGlyph = () => (
    <G>
        <ellipse cx={7} cy={9.4} rx={6.2} ry={2.4} />
        <path d="M 4 8.8 L 4 6 A 3 2.4 0 0 1 10 6 L 10 8.8 Z" />
    </G>
);

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
    const publicVictoryPoints = calculatePublicVictoryPoints(gameState, player.id);

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

    const armyTooltip = `Knights played: ${player.knightsPlayed || 0}\nLargest Army (>=${GAME_CONSTANTS.MIN_LARGEST_ARMY_COUNT}) grants ${GAME_CONSTANTS.VP_FROM_LARGEST_ARMY} VP.${gameState.largestArmyOwner === player.id ? '\n(Currently holds Largest Army)' : ''}`;

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

    const devVpTooltip = `VP Dev Cards (revealed): ${player.revealedDevCardVictoryPoints || 0}\nHidden VP dev cards are not shown here.`;

    // VP breakdown for tooltip
    const getVPBreakdown = () => {
        const settlements = 5 - player.settlementsRemaining;
        const cities = 4 - player.citiesRemaining;
        const parts = [
            `Settlements: ${settlements} VP`,
            `Cities: ${cities * 2} VP`,
        ];
        if (!isCK) parts.push(`Dev Card VPs: ${player.revealedDevCardVictoryPoints || 0} VP`);
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
                    ? 'bg-[var(--ui-panel-raised)] ring-1 ring-[var(--ui-accent)]/60 shadow-lg'
                    : 'bg-[var(--ui-panel-solid)]/60'
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
                        ${isCurrentPlayer ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}
                    `}
                    title={player.name}
                >
                    {player.name}
                    {isCurrentPlayer && <span className="text-xs text-[var(--ui-muted)] ml-1">(You)</span>}
                </span>

                {/* VP */}
                <Tooltip
                    content={getVPBreakdown()}
                    className="cursor-default"
                    tooltipClassName={tooltipClassName}
                    placement="left"
                >
                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                        {publicVictoryPoints}
                    </span>
                </Tooltip>
            </div>

            {/* Row 2: Stats + Special VP */}
            <div className="flex items-center gap-1 text-[12px] leading-tight text-[var(--ui-muted)]">
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
                            <HandGlyph />
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
                            <ScrollGlyph />
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
                            <RoadGlyph />
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
                                <ShieldFillGlyph />
                                <span className="font-bold tabular-nums">{activeKnightStrength}</span>
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            content={armyTooltip}
                            className="cursor-default"
                            tooltipClassName={tooltipClassName}
                            placement="bottom"
                        >
                            <span className={`flex items-center gap-1 ${gameState.largestArmyOwner === player.id ? 'text-purple-400' : ''}`}>
                                <ShieldFillGlyph />
                                <span className="font-bold tabular-nums">{player.knightsPlayed || 0}</span>
                            </span>
                        </Tooltip>
                    )}
                </div>

                {/* Special VP (base game) */}
                {!isCK && (
                    <Tooltip
                        content={devVpTooltip}
                        className="cursor-default"
                        tooltipClassName={tooltipClassName}
                        placement="bottom"
                    >
                        <span className={`flex items-center gap-1 ${(player.revealedDevCardVictoryPoints || 0) > 0 ? 'text-amber-300' : 'text-[var(--ui-muted)]'}`}>
                            <StarGlyph />
                            <span className="font-bold tabular-nums">{player.revealedDevCardVictoryPoints || 0}</span>
                        </span>
                    </Tooltip>
                )}

                {/* Divider for special VP */}
                {isCK && <span className="text-[var(--ui-muted)] mx-0.5">│</span>}

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
                            <span className={`flex items-center gap-1 ${defenderVP > 0 ? 'text-blue-300' : 'text-[var(--ui-muted)]'}`}>
                                <ShieldLineGlyph />
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
                            <span className={`flex items-center gap-1 ${vpCardsCount > 0 ? 'text-amber-300' : 'text-[var(--ui-muted)]'}`}>
                                <StarGlyph />
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
                            <span className={`flex items-center gap-1 ${hasMerchant ? 'text-green-400' : 'text-[var(--ui-muted)]'}`}>
                                <HatGlyph />{hasMerchant ? '●' : '–'}
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
                                className={`flex items-center gap-1 focus:outline-none rounded px-0.5 py-0.5 transition ${canOpenCityManagement ? 'hover:bg-[var(--ui-panel-raised)] cursor-pointer' : 'cursor-default'
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
