'use client';

import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { isValidMainPhaseCity } from '@/core/validation/building-validator';
import { BUILDING_COSTS, canAfford } from '@/core/rules/building-costs';
import { GameIcon } from '@/components/ui/icons/GameIcon';
import { Tooltip } from '@/components/ui/tooltip';

interface SettlementManagementDialogProps {
    gameState: GameState;
    playerId: string;
    vertexId: string;
    onClose: () => void;
    onUpgradeToCity: (vertexId: string) => Promise<void>;
}

export const SettlementManagementDialog: React.FC<SettlementManagementDialogProps> = ({
    gameState,
    playerId,
    vertexId,
    onClose,
    onUpgradeToCity
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const player = gameState.players.find(p => p.id === playerId);
    const vertex = gameState.board.vertices[vertexId];

    if (!player || !vertex || vertex.structure !== 'settlement' || vertex.owner !== playerId) {
        return null;
    }

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting;

    // Check if player can afford city upgrade
    const isValidVertex = isValidMainPhaseCity(gameState, vertexId, playerId);
    const hasResources = canAfford(player.resources, BUILDING_COSTS.city);
    const canUpgrade = isValidVertex && hasResources;

    const handleUpgradeToCity = async () => {
        if (!canAct || !canUpgrade) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onUpgradeToCity(vertexId);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to upgrade to city');
            setIsSubmitting(false);
        }
    };

    // Get player resources
    const wheat = player.resources?.wheat || 0;
    const ore = player.resources?.ore || 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border-2 border-slate-600 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Settlement Management
                    </h2>
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

                <div className="space-y-6">
                    {/* Upgrade to City */}
                    <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <Tooltip
                                    content="Upgrade to City - Doubles production from adjacent hexes.\n\nCost: 2 Wheat + 3 Ore\n\nIncreases the settlement's victory point value from 1 to 2."
                                    placement="left"
                                    tooltipClassName="whitespace-pre-line"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 cursor-default">
                                        <GameIcon
                                            type="city"
                                            size={40}
                                            playerColor="#ffffff"
                                            backgroundColor={player.color}
                                        />
                                    </div>
                                </Tooltip>
                                <div>
                                    <div className="font-bold text-lg text-white">
                                        Upgrade to City
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        Worth 2 Victory Points
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleUpgradeToCity}
                            disabled={!canAct || !canUpgrade}
                            className={`
                                w-full py-3 rounded font-bold flex items-center justify-between px-4 transition-all mt-3
                                ${canAct && canUpgrade
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105 cursor-pointer'
                                    : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                }
                            `}
                        >
                            <span>Upgrade to City</span>
                            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded text-sm">
                                <span>2 🌾</span>
                                <span>+</span>
                                <span>3 🪨</span>
                            </div>
                        </button>

                        {!canUpgrade && (
                            <div className="text-xs text-slate-400 mt-2 text-center">
                                {wheat < 2 || ore < 3
                                    ? `You need ${Math.max(0, 2 - wheat)} more wheat and ${Math.max(0, 3 - ore)} more ore`
                                    : 'Cannot upgrade at this time'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
