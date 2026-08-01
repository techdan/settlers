'use client';

import React from 'react';
import { PlayerState, GameState } from '@/lib/types';
import { Tooltip } from '@/components/ui/tooltip';
import { CompactImprovementBar } from './CompactImprovementBar';
import { IMPROVEMENT_TOOLTIPS } from '../city/CityManagementDialog';
import { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { calculatePublicVictoryPoints } from '@/core/rules/victory-conditions';
import {
    Merchant,
    TabletopCardBackIcon,
    TabletopCrossedSwordsIcon,
    TabletopImprovementIcon,
    TabletopRoadIcon,
    TabletopShieldIcon,
    TabletopVictoryPointIcon,
} from '@/themes/tabletop';
import { TT, mix } from '@/themes/tabletop/palette';

/** Live turn-clock state, supplied only for the player whose turn it is. */
export interface PlayerCardTimer {
    /** 0-100, elapsed against the base turn limit. */
    percentage: number;
    /** Tailwind background class carrying the urgency tint. */
    colorClass: string;
}

interface CompactPlayerCardProps {
    player: PlayerState;
    gameState: GameState;
    isCurrentPlayer: boolean;  // Is this the local user?
    isTurn: boolean;           // Is it this player's turn?
    onOpenCityManagement?: () => void;
    timer?: PlayerCardTimer | null;
}

/* Card stocks for the hand-size chips. Derived from the tabletop palette so a
 * chip reads as the same physical deck the tray renders full-size. */
const STOCK_HAND = TT.token.face;
const STOCK_DECK = mix(TT.token.face, TT.port.generic, 0.55);

const CHIP_ICON = 16;
const TOOLTIP_CLASS = 'min-w-[12rem] max-w-[20rem] whitespace-pre-line text-xs';

/**
 * The Merchant trophy is the board piece itself — hat, sash and all — not the
 * trade-improvement scales, which mean a different thing entirely. Wrapped here
 * rather than in the glyph set for the same reason `CompactImprovementBar` wraps
 * `Metropolis`: it is an existing piece at HUD size, not new art.
 */
const MerchantBadgeIcon: React.FC<{ color: string; height?: number }> = ({ color, height = 15 }) => (
    <svg
        viewBox="-13 -17 26 33"
        width={Math.round((height * 26) / 33)}
        height={height}
        role="img"
        aria-label="Merchant"
    >
        <Merchant color={color} />
    </svg>
);

/**
 * One stat: a shaped icon plus its number. Zeros drop to 40% so the eye lands
 * on whoever actually has something; `danger` rings the chip rather than merely
 * recoloring the digits, because hand size over the discard limit is the one
 * number an opponent needs to see from across the rail.
 */
const StatChip: React.FC<{
    testId: string;
    tooltip: string;
    icon: React.ReactNode;
    value: number;
    tint?: string;
    danger?: boolean;
}> = ({ testId, tooltip, icon, value, tint, danger = false }) => (
    <Tooltip content={tooltip} className="cursor-default" tooltipClassName={TOOLTIP_CLASS} placement="bottom">
        <span
            data-testid={testId}
            data-danger={danger ? 'true' : 'false'}
            className={`flex items-center gap-1 transition-opacity ${value === 0 ? 'opacity-40' : ''} ${
                danger ? 'rounded -mx-0.5 px-1 ring-1 ring-[var(--ui-danger)] bg-[var(--ui-danger)]/20' : ''
            }`}
        >
            {icon}
            <span
                className="text-[13px] font-bold leading-none tabular-nums"
                style={{ color: danger ? 'var(--ui-danger)' : tint ?? 'var(--ui-text)' }}
            >
                {value}
            </span>
        </span>
    </Tooltip>
);

/** A trophy the player currently holds. Never rendered when unheld — an empty
 *  award slot costs the same attention as a full one and says nothing. */
const AwardBadge: React.FC<{ testId: string; tooltip: string; icon: React.ReactNode; label?: string }> = ({
    testId,
    tooltip,
    icon,
    label,
}) => (
    <Tooltip content={tooltip} className="cursor-default" tooltipClassName={TOOLTIP_CLASS} placement="bottom">
        <span
            data-testid={testId}
            className="flex items-center gap-0.5 rounded bg-[var(--ui-panel-raised)] px-1 py-0.5 ring-1 ring-[var(--ui-border)]"
        >
            {icon}
            {label ? (
                <span className="text-[11px] font-bold leading-none tabular-nums text-[var(--ui-text)]">{label}</span>
            ) : null}
        </span>
    </Tooltip>
);

/**
 * Compact player card for the right rail.
 * Row 1: identity (color spine, name, VP token)
 * Row 2: hand-size chips + road length + knight/army strength
 * Row 3: city improvement tracks + trophies (C&K only)
 *
 * Detail lives in tooltips; the card itself only carries what should be
 * readable at a glance across four stacked panels.
 */
export const CompactPlayerCard: React.FC<CompactPlayerCardProps> = ({
    player,
    gameState,
    isCurrentPlayer,
    isTurn,
    onOpenCityManagement,
    timer,
}) => {
    const isCK = gameState.gameMode === 'cities_and_knights';
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
    const hasLargestArmy = gameState.largestArmyOwner === player.id;

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
    const overLimitNote = isDanger ? '\nOver limit - vulnerable to robber!' : '';
    const handTooltip = `Cards in hand: ${totalCards}\nSafe limit: ${safeLimit}${overLimitNote}`;

    const roadTooltip = `Road length: ${longestRoad}${hasLongestRoad ? '\nHolds Longest Road (+2 VP)' : `\nLongest Road requires ${GAME_CONSTANTS.MIN_LONGEST_ROAD_LENGTH}+`}`;

    const defenseTooltip = `Active knight strength: ${activeKnightStrength}\nUsed to defend against Barbarian attacks`;

    const armyTooltip = `Knights played: ${player.knightsPlayed || 0}\nLargest Army (>=${GAME_CONSTANTS.MIN_LARGEST_ARMY_COUNT}) grants ${GAME_CONSTANTS.VP_FROM_LARGEST_ARMY} VP.${hasLargestArmy ? '\n(Currently holds Largest Army)' : ''}`;

    const cardTooltip = isCK
        ? `Progress cards: ${progressCardCount}`
        : `Development cards: ${devCardCount}`;

    const defenderTooltip = `Defender of Catan: ${defenderVP} VP\nEarned by contributing most knights to defense`;

    const merchantTooltip = 'Merchant: +1 VP\n2:1 trade ratio for the hex resource';

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
            if (hasLargestArmy) parts.push('Largest Army: 2 VP');
        }
        return parts.join('\n');
    };

    // The player's color washes the whole surface rather than sitting in a 12px
    // dot: across four stacked cards, hue is what maps a panel to its pieces on
    // the board. player.color is a 4-value hex union, so every blend is known.
    const surface = isTurn
        ? `color-mix(in oklab, ${player.color} 18%, var(--ui-panel-raised))`
        : `color-mix(in oklab, ${player.color} 9%, var(--ui-panel-solid))`;

    return (
        <div
            data-testid={`player-card-${player.id}`}
            data-turn={isTurn ? 'true' : 'false'}
            className={`relative overflow-hidden rounded-lg transition-all ${
                isTurn ? 'ring-1 ring-inset ring-[var(--ui-accent)]/70 shadow-lg' : ''
            }`}
            style={{ background: surface }}
        >
            {/* Color spine */}
            <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: player.color }}
            />

            <div className="flex flex-col gap-1.5 py-2 pl-3 pr-2">
                {/* Row 1: Identity */}
                <div className="flex items-center gap-2">
                    <span
                        className={`flex-1 truncate text-sm font-semibold ${
                            isCurrentPlayer ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'
                        }`}
                        title={player.name}
                    >
                        {player.name}
                        {isCurrentPlayer && <span className="ml-1 text-xs text-[var(--ui-muted)]">(You)</span>}
                    </span>

                    <Tooltip
                        content={getVPBreakdown()}
                        className="cursor-default"
                        tooltipClassName={TOOLTIP_CLASS}
                        placement="left"
                    >
                        <TabletopVictoryPointIcon
                            value={publicVictoryPoints}
                            ring={player.color}
                            size={26}
                            label={`${publicVictoryPoints} victory points`}
                        />
                    </Tooltip>
                </div>

                {/* Row 2: Hand size, road, military */}
                <div className="flex items-center gap-2.5">
                    <StatChip
                        testId="chip-hand"
                        tooltip={handTooltip}
                        icon={<TabletopCardBackIcon stock={STOCK_HAND} size={CHIP_ICON} />}
                        value={totalCards}
                        danger={isDanger}
                    />

                    <StatChip
                        testId="chip-deck"
                        tooltip={cardTooltip}
                        icon={<TabletopCardBackIcon stock={STOCK_DECK} size={CHIP_ICON} />}
                        value={isCK ? progressCardCount : devCardCount}
                    />

                    <StatChip
                        testId="chip-road"
                        tooltip={roadTooltip}
                        icon={<TabletopRoadIcon fill={hasLongestRoad ? TT.port.generic : TT.status.neutral} size={CHIP_ICON} />}
                        value={longestRoad}
                        tint={hasLongestRoad ? TT.port.generic : undefined}
                    />

                    {isCK ? (
                        <StatChip
                            testId="chip-military"
                            tooltip={defenseTooltip}
                            icon={<TabletopShieldIcon size={CHIP_ICON} />}
                            value={activeKnightStrength}
                        />
                    ) : (
                        <StatChip
                            testId="chip-military"
                            tooltip={armyTooltip}
                            icon={<TabletopShieldIcon fill={hasLargestArmy ? TT.category.politics : TT.status.neutral} size={CHIP_ICON} />}
                            value={player.knightsPlayed || 0}
                            tint={hasLargestArmy ? TT.status.good : undefined}
                        />
                    )}

                    {!isCK && hasLargestArmy && (
                        <span className="ml-auto">
                            <AwardBadge
                                testId="award-largest-army"
                                tooltip={armyTooltip}
                                icon={<TabletopCrossedSwordsIcon fill={TT.token.ringInner} size={13} label="Largest Army" />}
                            />
                        </span>
                    )}
                </div>

                {/* Row 3: City improvement tracks + trophies (C&K only) */}
                {isCK && (
                    <div className="flex items-center gap-2">
                        {(['science', 'trade', 'politics'] as const).map(type => (
                            <Tooltip
                                key={type}
                                content={IMPROVEMENT_TOOLTIPS[type]}
                                className="cursor-default"
                                tooltipClassName={TOOLTIP_CLASS}
                                placement="bottom"
                            >
                                <button
                                    type="button"
                                    onClick={() => canOpenCityManagement && onOpenCityManagement?.()}
                                    aria-label={`${type} improvements`}
                                    className={`flex items-center gap-1 rounded px-0.5 py-0.5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-accent)] ${
                                        canOpenCityManagement ? 'cursor-pointer hover:bg-[var(--ui-panel-raised)]' : 'cursor-default'
                                    }`}
                                >
                                    <TabletopImprovementIcon type={type} size={13} />
                                    <CompactImprovementBar
                                        type={type}
                                        level={player.improvements?.[type] || 0}
                                        hasMetropolis={player.metropolisOwned?.includes(type)}
                                        dotSize={5}
                                    />
                                </button>
                            </Tooltip>
                        ))}

                        {(defenderVP > 0 || hasMerchant) && (
                            <div className="ml-auto flex items-center gap-1">
                                {defenderVP > 0 && (
                                    <AwardBadge
                                        testId="award-defender"
                                        tooltip={defenderTooltip}
                                        // Crossed swords, not a shield: the shield is
                                        // already the knight-strength stat on this same
                                        // card. Largest Army (base) and Defender (C&K)
                                        // never co-occur, so one glyph can carry "the
                                        // military honour" in whichever mode you are in.
                                        icon={<TabletopCrossedSwordsIcon fill={TT.token.ringInner} size={13} label="Defender of Catan" />}
                                        label={String(defenderVP)}
                                    />
                                )}
                                {hasMerchant && (
                                    <AwardBadge
                                        testId="award-merchant"
                                        tooltip={merchantTooltip}
                                        icon={<MerchantBadgeIcon color={player.color} />}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Turn clock, on the card it belongs to rather than in the shared
                header — whose turn it is and how long is left are one fact. */}
            {timer && (
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--ui-panel-raised)]">
                    <div
                        data-testid="turn-timer-bar"
                        className={`h-full transition-all duration-1000 ease-linear ${timer.colorClass}`}
                        style={{ width: `${timer.percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
};
