'use client';

import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ImprovementType, CK_CONSTANTS, CommodityType } from '@/core/rules/commodity-constants';
import { canAffordImprovement, getUpgradeCost } from '@/core/engine/improvements/improvement-manager';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { CityWall, TabletopCommodityIcon, TabletopImprovementIcon, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface CityManagementDialogProps {
    gameState: GameState;
    playerId: string;
    vertexId?: string;
    onClose: () => void;
    onUpgradeImprovement?: (improvement: ImprovementType) => Promise<void>;
    onCraneUpgrade?: (improvement: ImprovementType) => Promise<void>;
    onBuildWall?: (vertexId: string) => Promise<void>;
    variant?: 'default' | 'crane';
    showCityWall?: boolean;
}

const IMPROVEMENT_NAMES: Record<ImprovementType, string> = {
    science: 'Science',
    trade: 'Trade',
    politics: 'Politics'
};

const IMPROVEMENT_COMMODITIES: Record<ImprovementType, CommodityType> = {
    science: 'paper',
    trade: 'cloth',
    politics: 'coin'
};

export const IMPROVEMENT_TOOLTIPS: Record<ImprovementType, string> = {
    science: 'Science Improvement Track (Green)\nUpgrade with Paper commodities.\n\nLevel 3: Aqueduct\nIf you produce no resources on a dice roll (except 7),\nyou may take any one resource of your choice.',
    trade: 'Trade Improvement Track (Yellow)\nUpgrade with Cloth commodities.\n\nLevel 3: Trading House\nYou may trade any 2 identical commodities\nfor any 1 other commodity or resource.',
    politics: 'Politics Improvement Track (Blue)\nUpgrade with Coin commodities.\n\nLevel 3: Fortress\nYou may promote Strong Knights to Mighty Knights.'
};

const IMPROVEMENT_LEVEL3_DESCRIPTIONS: Record<ImprovementType, string> = {
    science: 'Level 3 Aqueduct: If you produce no resources on a dice roll (except 7), you may take any one resource.',
    trade: 'Level 3 Trading House: You may trade any 2 identical commodities for any 1 other commodity or resource.',
    politics: 'Level 3 Fortress: You may promote Strong Knights to Mighty Knights.'
};

export const CityManagementDialog: React.FC<CityManagementDialogProps> = ({
    gameState,
    playerId,
    vertexId,
    onClose,
    onUpgradeImprovement,
    onCraneUpgrade,
    onBuildWall,
    variant = 'default',
    showCityWall = true
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check timer status
    const timerStatus = useTimerState(gameState);

    const player = gameState.players.find(p => p.id === playerId);
    const vertex = vertexId ? gameState.board.vertices[vertexId] : null;

    const isCraneMode = variant === 'crane';
    const allowNoVertex = showCityWall === false;

    if (!player || (!vertex && !isCraneMode && !allowNoVertex)) return null;

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting && !timerStatus.isLocked;
    const upgradeDiscount = isCraneMode ? 1 : 0;

    const handleUpgrade = async (improvement: ImprovementType) => {
        if (!canAct) return;

        // Check if this upgrade will require metropolis placement
        const level = player.improvements?.[improvement] || 0;
        const metropolis = gameState.metropolises?.[improvement];
        const metropolisOwner = metropolis?.owner ? gameState.players.find(p => p.id === metropolis.owner) : null;
        const metropolisOwnerLevel = metropolisOwner?.improvements?.[improvement] || 0;

        const willBuildMetropolis = level === 3 && !metropolis?.owner;
        const willStealMetropolis = level === 4 && metropolis?.owner && metropolis?.owner !== playerId && metropolisOwnerLevel < 5;
        const requiresMetropolisPlacement = willBuildMetropolis || willStealMetropolis;

        setIsSubmitting(true);
        setError(null);
        try {
            if (isCraneMode && onCraneUpgrade) {
                await onCraneUpgrade(improvement);
                onClose();
            } else if (onUpgradeImprovement) {
                await onUpgradeImprovement(improvement);
                // Close modal if metropolis placement is required
                if (requiresMetropolisPlacement) {
                    onClose();
                }
            } else {
                throw new Error('Upgrade handler not provided');
            }
        } catch (error: unknown) {
            setError(
                error instanceof Error && error.message
                    ? error.message
                    : 'Failed to upgrade'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuildWall = async () => {
        if (!canAct || !onBuildWall || !vertexId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onBuildWall(vertexId);
        } catch (error: unknown) {
            setError(
                error instanceof Error && error.message
                    ? error.message
                    : 'Failed to build wall'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const canBuildWallForVertex = vertexId ? canBuildCityWall(gameState, vertexId, playerId) : false;
    const title = isCraneMode ? 'Crane' : 'City Management';

    return (
        <TabletopModal title={title} onClose={onClose} width="lg">
                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_14%,var(--ui-panel-solid))] p-3 text-[var(--ui-text)]"
                    >
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* City Improvements */}
                    {(['science', 'trade', 'politics'] as ImprovementType[]).map(type => {
                        const level = player.improvements?.[type] || 0;
                        const isMax = level >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL;
                        const cost = getUpgradeCost(level, upgradeDiscount);
                        const commodity = IMPROVEMENT_COMMODITIES[type];
                        const playerCommodityCount = player.commodities?.[commodity] || 0;
                        const canAfford = canAffordImprovement(player, type, upgradeDiscount);

                        // Check if player has cities available for metropolis
                        const playerCities = Object.values(gameState.board.vertices).filter(v =>
                            v.owner === playerId && v.structure === 'city'
                        );
                        const hasCities = playerCities.length > 0;

                        // Check metropolis status
                        const metropolis = gameState.metropolises?.[type];
                        const metropolisOwner = metropolis?.owner ? gameState.players.find(p => p.id === metropolis.owner) : null;
                        const metropolisOwnerLevel = metropolisOwner?.improvements?.[type] || 0;

                        // Conditions for when upgrade will trigger metropolis placement
                        const willBuildMetropolis = level === 3 && !metropolis?.owner; // Level 3→4 and unclaimed - REQUIRES SELECTION
                        const willSecureMetropolis = level === 4 && metropolis?.owner === playerId; // Level 4→5 and own it - NO SELECTION, just secures in place
                        const willStealMetropolis = level === 4 && metropolis?.owner && metropolis?.owner !== playerId && metropolisOwnerLevel < 5; // Level 4→5 and can steal - REQUIRES SELECTION
                        const metropolisSecured = metropolis?.owner && metropolisOwnerLevel >= 5;

                        // Only require cities if the upgrade will actually trigger metropolis SELECTION (not just securing)
                        const upgradeWillTriggerMetropolis = willBuildMetropolis || willStealMetropolis;
                        const cannotBuildNoCity = upgradeWillTriggerMetropolis && !hasCities;

                        // Disable button if upgrade would trigger metropolis but player has no cities
                        const isDisabled = !canAct || !canAfford || cannotBuildNoCity;

                        return (
                            <div key={type} className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Tooltip content={IMPROVEMENT_TOOLTIPS[type]} placement="left" tooltipClassName="whitespace-pre-line">
                                            <div className="flex h-12 w-12 cursor-default items-center justify-center rounded-full bg-[var(--ui-panel-solid)]">
                                                <TabletopImprovementIcon type={type} size={38} label={`${IMPROVEMENT_NAMES[type]} improvement`} />
                                            </div>
                                        </Tooltip>
                                        <div className="flex-1 flex items-center gap-6">
                                            <div className="flex-shrink-0">
                                                <div className="text-lg font-bold text-[var(--ui-text)]">
                                                    {IMPROVEMENT_NAMES[type]}
                                                </div>
                                                <div className="whitespace-nowrap text-sm text-[var(--ui-muted)]">
                                                    Level {level} / {CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL}
                                                </div>
                                            </div>
                                            <div className={`px-3 text-xs ${level >= 3 ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-text)]'}`}>
                                                {IMPROVEMENT_LEVEL3_DESCRIPTIONS[type]}
                                            </div>
                                        </div>
                                    </div>

                                    {!isMax ? (
                                        <TabletopButton
                                            variant="primary"
                                            onClick={() => handleUpgrade(type)}
                                            disabled={!!isDisabled}
                                            className="flex min-w-[140px] items-center justify-center gap-2"
                                        >
                                            <span>Upgrade ({playerCommodityCount} / {cost})</span>
                                            <TabletopCommodityIcon type={commodity} size={20} label={commodity} />
                                        </TabletopButton>
                                    ) : (
                                        <div className="rounded border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] px-4 py-2 text-sm font-bold text-[var(--ui-text)]">
                                            Max Level
                                        </div>
                                    )}
                                </div>

                                {/* Metropolis Status and Messages */}
                                {metropolis?.owner && !willBuildMetropolis && !willSecureMetropolis && !willStealMetropolis && (
                                    <div className="mt-2 flex items-center gap-2 rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] px-3 py-2 text-xs text-[var(--ui-muted)]">
                                        <TabletopImprovementIcon type={type} size={18} /> {metropolisOwner?.name} has the {IMPROVEMENT_NAMES[type]} Metropolis
                                        {metropolisSecured ? ' (secured at level 5)' : ' (level 4, can be stolen at level 5)'}
                                    </div>
                                )}
                                {willBuildMetropolis && hasCities && (
                                    <div className="mt-2 flex items-center gap-2 rounded border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] px-3 py-2 text-xs text-[var(--ui-text)]">
                                        <TabletopStatusIcon type="info" size={18} /> Upgrading will let you claim the {IMPROVEMENT_NAMES[type]} Metropolis! (+2 VP)
                                    </div>
                                )}
                                {willSecureMetropolis && (
                                    <div className="mt-2 flex items-center gap-2 rounded border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] px-3 py-2 text-xs text-[var(--ui-text)]">
                                        <TabletopStatusIcon type="confirm" size={18} /> Upgrading will secure your {IMPROVEMENT_NAMES[type]} Metropolis at level 5! (cannot be stolen)
                                    </div>
                                )}
                                {willStealMetropolis && hasCities && (
                                    <div className="mt-2 flex items-center gap-2 rounded border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2 text-xs text-[var(--ui-text)]">
                                        <TabletopStatusIcon type="warning" size={18} /> Upgrading will let you steal the {IMPROVEMENT_NAMES[type]} Metropolis from {metropolisOwner?.name}!
                                    </div>
                                )}
                                {!isMax && upgradeWillTriggerMetropolis && cannotBuildNoCity && (
                                    <div className="mt-2 flex items-center gap-2 rounded border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2 text-xs text-[var(--ui-text)]">
                                        <TabletopStatusIcon type="cancel" size={18} /> You need at least one City to build a Metropolis. Build a city first!
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* City Wall */}
                    {!isCraneMode && showCityWall && vertex && (
                        <div className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                        <div className="flex items-center gap-4">
                            <Tooltip
                                content="City Wall - Protects your city from the robber.\n\nCost: 2 Brick\n\nIncreases your maximum hand size by 2 cards (from 7 to 9).\n\nWhen a 7 is rolled, you only discard half your cards if you have more than 9 cards instead of 7."
                                placement="left"
                                tooltipClassName="whitespace-pre-line"
                            >
                                <div className="flex h-12 w-12 cursor-default items-center justify-center rounded-full bg-[var(--ui-panel-solid)]">
                                    <svg viewBox="-18 -8 36 24" width="44" height="34" aria-hidden="true">
                                        <CityWall color={player.color} />
                                    </svg>
                                </div>
                            </Tooltip>
                                <div>
                                    <div className="text-lg font-bold text-[var(--ui-text)]">
                                        City Wall
                                    </div>
                                    <div className="text-sm text-[var(--ui-muted)]">
                                        {vertex.hasCityWall ? 'Active' : 'Not Built'}
                                    </div>
                                </div>
                            </div>

                            {!vertex.hasCityWall ? (
                                <TabletopButton
                                    variant="primary"
                                    onClick={handleBuildWall}
                                    disabled={!canAct || !canBuildWallForVertex}
                                    className="flex min-w-[150px] items-center justify-center gap-2"
                                >
                                    <span>Build Wall (2)</span><TabletopResourceIcon type="brick" size={20} label="brick" />
                                </TabletopButton>
                            ) : (
                                <div className="rounded border border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-solid))] px-4 py-2 text-sm font-bold text-[var(--ui-text)]">
                                    Built City Wall
                                </div>
                            )}
                        </div>
                    )}
                </div>
        </TabletopModal>
    );
};
