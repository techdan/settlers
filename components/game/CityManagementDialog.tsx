'use client';

import React, { useState } from 'react';
import { GameState, PlayerState } from '@/lib/types';
import { ImprovementType, IMPROVEMENT_UPGRADE_COSTS, CK_CONSTANTS, CommodityType } from '@/core/rules/commodity-constants';
import { canAffordImprovement, getUpgradeCost } from '@/core/engine/improvements/improvement-manager';
import { canBuildCityWall } from '@/core/validation/city-wall-validator';
import { getCityWallCount } from '@/core/utils/city-wall-utils';

interface CityManagementDialogProps {
    gameState: GameState;
    playerId: string;
    vertexId: string;
    onClose: () => void;
    onUpgradeImprovement: (improvement: ImprovementType) => Promise<void>;
    onBuildWall: (vertexId: string) => Promise<void>;
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

export const CityManagementDialog: React.FC<CityManagementDialogProps> = ({
    gameState,
    playerId,
    vertexId,
    onClose,
    onUpgradeImprovement,
    onBuildWall
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const player = gameState.players.find(p => p.id === playerId);
    const vertex = gameState.board.vertices[vertexId];

    if (!player || !vertex) return null;

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting;

    const handleUpgrade = async (improvement: ImprovementType) => {
        if (!canAct) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onUpgradeImprovement(improvement);
            // Don't close dialog, allow multiple upgrades
        } catch (e: any) {
            setError(e.message || 'Failed to upgrade');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuildWall = async () => {
        if (!canAct) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onBuildWall(vertexId);
            // Don't close dialog
        } catch (e: any) {
            setError(e.message || 'Failed to build wall');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canBuildWall = canBuildCityWall(gameState, vertexId, playerId);
    const wallCount = getCityWallCount(gameState, playerId);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border-2 border-slate-600 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            City Management
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-2xl cursor-pointer"
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
                        const cost = getUpgradeCost(level);
                        const commodity = IMPROVEMENT_COMMODITIES[type];
                        const playerCommodityCount = player.commodities?.[commodity] || 0;
                        const canAfford = canAffordImprovement(player, type);

                        const colorClass = type === 'science' ? 'text-green-400' :
                            type === 'trade' ? 'text-yellow-400' : 'text-blue-400';
                        const bgClass = type === 'science' ? 'bg-green-500' :
                            type === 'trade' ? 'bg-yellow-500' : 'bg-blue-500';

                        return (
                            <div key={type} className="bg-slate-700/50 p-4 rounded border border-slate-600 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-12 rounded-full ${bgClass}`}></div>
                                    <div>
                                        <div className={`font-bold text-lg ${colorClass}`}>
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
                                        disabled={!canAct || !canAfford}
                                        className={`
                                            px-4 py-2 rounded text-sm font-bold transition-all min-w-[120px]
                                            ${canAct && canAfford
                                                ? 'bg-slate-200 text-slate-900 hover:bg-white shadow-lg hover:scale-105'
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
                        );
                    })}

                    {/* City Wall */}
                    <div className="bg-slate-700/50 p-4 rounded border border-slate-600 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-12 rounded-full bg-orange-500"></div>
                            <div>
                                <div className="font-bold text-lg text-orange-400">
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
                                disabled={!canAct || !canBuildWall}
                                title="Increases max hand size by 2 cards. Protects against robber discard."
                                className={`
                                    px-4 py-2 rounded text-sm font-bold transition-all min-w-[120px]
                                    ${canAct && canBuildWall
                                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg hover:scale-105'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                Build Wall (2 🧱)
                            </button>
                        ) : (
                            <div className="px-4 py-2 bg-green-900/20 text-green-400 rounded border border-green-900/50 font-bold text-sm">
                                Built ✓
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
