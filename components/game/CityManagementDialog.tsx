'use client';

import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ImprovementType, CK_CONSTANTS, CommodityType } from '@/core/rules/commodity-constants';
import { canAffordImprovement, getUpgradeCost } from '@/core/engine/improvements/improvement-manager';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { GameIcon } from '@/components/ui/icons/GameIcon';

interface CityManagementDialogProps {
    gameState: GameState;
    playerId: string;
    vertexId?: string;
    onClose: () => void;
    onUpgradeImprovement?: (improvement: ImprovementType) => Promise<void>;
    onCraneUpgrade?: (improvement: ImprovementType) => Promise<void>;
    onBuildWall?: (vertexId: string) => Promise<void>;
    variant?: 'default' | 'crane';
}

const COMMODITY_ICONS: Record<CommodityType, string> = {
    paper: '📜',
    cloth: '🧵',
    coin: '🪙'
};

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

const IMPROVEMENT_TOOLTIPS: Record<ImprovementType, string> = {
    science: 'Science Improvement Track (Green)\nUpgrade with Paper commodities.\n\nLevel 3: Aqueduct\nIf you produce no resources on a dice roll (except 7),\nyou may take any one resource of your choice.',
    trade: 'Trade Improvement Track (Yellow)\nUpgrade with Cloth commodities.\n\nLevel 3: Trading House\nYou may trade any 2 identical commodities\nfor any 1 other commodity or resource.',
    politics: 'Politics Improvement Track (Blue)\nUpgrade with Coin commodities.\n\nLevel 3: Fortress\nYou may promote Strong Knights to Mighty Knights.'
};

export const CityManagementDialog: React.FC<CityManagementDialogProps> = ({
    gameState,
    playerId,
    vertexId,
    onClose,
    onUpgradeImprovement,
    onCraneUpgrade,
    onBuildWall,
    variant = 'default'
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const player = gameState.players.find(p => p.id === playerId);
    const vertex = vertexId ? gameState.board.vertices[vertexId] : null;

    const isCraneMode = variant === 'crane';

    if (!player || (!vertex && !isCraneMode)) return null;

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting;
    const upgradeDiscount = isCraneMode ? 1 : 0;

    const handleUpgrade = async (improvement: ImprovementType) => {
        if (!canAct) return;

        setIsSubmitting(true);
        setError(null);
        try {
            if (isCraneMode && onCraneUpgrade) {
                await onCraneUpgrade(improvement);
                onClose();
            } else if (onUpgradeImprovement) {
                await onUpgradeImprovement(improvement);
            } else {
                throw new Error('Upgrade handler not provided');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to upgrade');
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
        } catch (e: any) {
            setError(e.message || 'Failed to build wall');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canBuildWallForVertex = vertexId ? canBuildCityWall(gameState, vertexId, playerId) : false;
    const title = isCraneMode ? 'Crane' : 'City Management';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border-2 border-slate-600 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-2xl cursor-pointer"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4">
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

                        // Updated colors from icons.md
                        const iconColor = type === 'science' ? '#6bb97f' :
                            type === 'trade' ? '#c6daa4' : '#d7dfd1';

                        return (
                            <div key={type} className="bg-slate-700/50 p-4 rounded border border-slate-600">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex items-center justify-center w-12 h-12 cursor-help"
                                            title={IMPROVEMENT_TOOLTIPS[type]}
                                        >
                                            <GameIcon type={type} size={40} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg text-white">
                                                {IMPROVEMENT_NAMES[type]}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                Level {level} / {CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL}
                                            </div>
                                        </div>
                                    </div>

                                    {!isMax ? (
                                        <button
                                            onClick={() => handleUpgrade(type)}
                                            disabled={!!isDisabled}
                                            className={`
                                                px-4 py-2 rounded text-sm font-bold transition-all min-w-[120px]
                                                ${canAct && canAfford && !cannotBuildNoCity
                                                    ? 'bg-slate-200 text-slate-900 hover:bg-white shadow-lg hover:scale-105 cursor-pointer'
                                                    : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                }
                                            `}
                                        >
                                            Upgrade ({playerCommodityCount} / {cost}) {COMMODITY_ICONS[commodity]}
                                        </button>
                                    ) : (
                                        <div className="px-4 py-2 bg-green-900/20 text-green-400 rounded border border-green-900/50 font-bold text-sm">
                                            Max Level
                                        </div>
                                    )}
                                </div>

                                {/* Metropolis Status and Messages */}
                                {metropolis?.owner && !willBuildMetropolis && !willSecureMetropolis && !willStealMetropolis && (
                                    <div className="text-xs text-slate-300 bg-slate-700/30 border border-slate-600/50 rounded px-3 py-2 mt-2">
                                        🏛️ {metropolisOwner?.name} has the {IMPROVEMENT_NAMES[type]} Metropolis
                                        {metropolisSecured ? ' (secured at level 5)' : ' (level 4, can be stolen at level 5)'}
                                    </div>
                                )}
                                {willBuildMetropolis && hasCities && (
                                    <div className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-700/50 rounded px-3 py-2 mt-2">
                                        ⭐ Upgrading will let you claim the {IMPROVEMENT_NAMES[type]} Metropolis! (+2 VP)
                                    </div>
                                )}
                                {willSecureMetropolis && (
                                    <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700/50 rounded px-3 py-2 mt-2">
                                        🏛️ Upgrading will secure your {IMPROVEMENT_NAMES[type]} Metropolis at level 5! (cannot be stolen)
                                    </div>
                                )}
                                {willStealMetropolis && hasCities && (
                                    <div className="text-xs text-orange-300 bg-orange-900/20 border border-orange-700/50 rounded px-3 py-2 mt-2">
                                        ⚔️ Upgrading will let you steal the {IMPROVEMENT_NAMES[type]} Metropolis from {metropolisOwner?.name}!
                                    </div>
                                )}
                                {!isMax && upgradeWillTriggerMetropolis && cannotBuildNoCity && (
                                    <div className="text-xs text-red-300 bg-red-900/20 border border-red-700/50 rounded px-3 py-2 mt-2">
                                        ❌ You need at least one City to build a Metropolis. Build a city first!
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* City Wall */}
                    {!isCraneMode && vertex && (
                        <div className="bg-slate-700/50 p-4 rounded border border-slate-600 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex items-center justify-center w-12 h-12 cursor-help"
                                    title="City Wall - Protects your city from the robber.\n\nCost: 2 Brick\n\nIncreases your maximum hand size by 2 cards (from 7 to 9).\n\nWhen a 7 is rolled, you only discard half your cards if you have more than 9 cards instead of 7."
                                >
                                    <GameIcon type="city-wall" size={40} playerColor="#d97706" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-white">
                                        City Wall
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {vertex.hasCityWall ? 'Active' : 'Not Built'}
                                    </div>
                                </div>
                            </div>

                            {!vertex.hasCityWall ? (
                                <button
                                    onClick={handleBuildWall}
                                    disabled={!canAct || !canBuildWallForVertex}
                                    className={`
                                        px-4 py-2 rounded text-sm font-bold transition-all min-w-[120px]
                                        ${canAct && canBuildWallForVertex
                                            ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg hover:scale-105 cursor-pointer'
                                            : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                        }
                                    `}
                                >
                                    Build Wall (2 Brick)
                                </button>
                            ) : (
                                <div className="px-4 py-2 bg-green-900/20 text-green-400 rounded border border-green-900/50 font-bold text-sm">
                                    Built City Wall
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
