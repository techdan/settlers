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
                        className="text-slate-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* City Improvements */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-300 border-b border-blue-900/50 pb-2">
                            City Improvements
                        </h3>

                        {(['science', 'trade', 'politics'] as ImprovementType[]).map(type => {
                            const level = player.improvements?.[type] || 0;
                            const isMax = level >= CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL;
                            const cost = getUpgradeCost(level);
                            const commodity = IMPROVEMENT_COMMODITIES[type];
                            const canAfford = canAffordImprovement(player, type);

                            return (
                                <div key={type} className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {IMPROVEMENT_NAMES[type]}
                                        </div>
                                        <div className="text-sm text-slate-300">
                                            Level {level} / {CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-900 h-2 rounded-full mb-3 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${type === 'science' ? 'bg-green-500' :
                                                type === 'trade' ? 'bg-yellow-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${(level / CK_CONSTANTS.MAX_IMPROVEMENT_LEVEL) * 100}%` }}
                                        />
                                    </div>

                                    {!isMax ? (
                                        <button
                                            onClick={() => handleUpgrade(type)}
                                            disabled={!canAct || !canAfford}
                                            className={`
                                                w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all
                                                ${canAct && canAfford
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-[1.02]'
                                                    : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                }
                                            `}
                                        >
                                            <span>Upgrade</span>
                                            <div className="flex items-center gap-1 bg-black/20 px-2 rounded">
                                                <span>{cost}</span>
                                                <span>{COMMODITY_ICONS[commodity]}</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="text-center text-green-400 font-bold py-2 bg-green-900/20 rounded">
                                            Max Level Reached
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* City Walls & Info */}
                    <div className="space-y-6">
                        {/* City Wall Section */}
                        <div>
                            <h3 className="text-lg font-bold text-orange-300 border-b border-orange-900/50 pb-2 mb-4">
                                City Defenses
                            </h3>

                            <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="font-bold text-white mb-1">City Wall</div>
                                        <div className="text-xs text-slate-400">
                                            Increases max hand size by 2 cards.
                                            <br />
                                            Protects against robber discard.
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${vertex.hasCityWall ? 'text-green-400' : 'text-slate-500'}`}>
                                            {vertex.hasCityWall ? 'Active' : 'Not Built'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {wallCount}/3 Walls Built
                                        </div>
                                    </div>
                                </div>

                                {!vertex.hasCityWall ? (
                                    <button
                                        onClick={handleBuildWall}
                                        disabled={!canAct || !canBuildWall}
                                        className={`
                                            w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all
                                            ${canAct && canBuildWall
                                                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:scale-[1.02]'
                                                : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                            }
                                        `}
                                    >
                                        <span>Build Wall</span>
                                        <div className="flex items-center gap-1 bg-black/20 px-2 rounded">
                                            <span>2</span>
                                            <span>🧱</span>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="text-center text-green-400 font-bold py-2 bg-green-900/20 rounded border border-green-900/50">
                                        Wall Constructed ✓
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Player Commodities */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4">
                                Available Commodities
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(['paper', 'cloth', 'coin'] as CommodityType[]).map(type => (
                                    <div key={type} className="bg-slate-900 p-2 rounded text-center border border-slate-700">
                                        <div className="text-2xl mb-1">{COMMODITY_ICONS[type]}</div>
                                        <div className="font-bold text-white">{player.commodities?.[type] || 0}</div>
                                        <div className="text-xs text-slate-500 capitalize">{type}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
