import React, { useState, useTransition } from 'react';
import { PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { CK_CONSTANTS, KNIGHT_COST, KNIGHT_ACTIVATION_COST, KNIGHT_UPGRADE_COST } from '@/core/rules/commodity-constants';

interface KnightControlsProps {
    player: PlayerState;
    roomId: string;
    onBuildKnight: () => Promise<void>;
    onActivateKnight: (knightId: string) => Promise<void>;
    onMoveKnight: (knightId: string) => Promise<void>;
    onUpgradeKnight: (knightId: string) => Promise<void>;
}

const KNIGHT_LEVEL_LABELS: Record<Knight['level'], string> = {
    basic: 'Basic',
    strong: 'Strong',
    mighty: 'Mighty'
};

const KNIGHT_LEVEL_STRENGTH: Record<Knight['level'], number> = {
    basic: CK_CONSTANTS.KNIGHT_STRENGTH.basic,
    strong: CK_CONSTANTS.KNIGHT_STRENGTH.strong,
    mighty: CK_CONSTANTS.KNIGHT_STRENGTH.mighty
};

export const KnightControls: React.FC<KnightControlsProps> = ({
    player,
    roomId,
    onBuildKnight,
    onActivateKnight,
    onMoveKnight,
    onUpgradeKnight
}) => {
    const [isPending, startTransition] = useTransition();
    const [selectedKnight, setSelectedKnight] = useState<string | null>(null);

    // Only show in C&K mode
    if (!player.knights) {
        return null;
    }

    const canAffordKnight = () => {
        return (player.resources.sheep || 0) >= KNIGHT_COST.sheep &&
               (player.resources.ore || 0) >= KNIGHT_COST.ore;
    };

    const canAffordActivation = () => {
        return (player.resources.wheat || 0) >= KNIGHT_ACTIVATION_COST.wheat;
    };

    const canAffordUpgrade = () => {
        return (player.resources.sheep || 0) >= KNIGHT_UPGRADE_COST.sheep &&
               (player.resources.ore || 0) >= KNIGHT_UPGRADE_COST.ore;
    };

    const handleBuild = () => {
        if (!canAffordKnight()) return;
        startTransition(async () => {
            try {
                await onBuildKnight();
            } catch (error) {
                console.error('Failed to build knight:', error);
            }
        });
    };

    const handleActivate = (knightId: string) => {
        startTransition(async () => {
            try {
                await onActivateKnight(knightId);
            } catch (error) {
                console.error('Failed to activate knight:', error);
            }
        });
    };

    const handleMove = (knightId: string) => {
        startTransition(async () => {
            try {
                await onMoveKnight(knightId);
            } catch (error) {
                console.error('Failed to move knight:', error);
            }
        });
    };

    const handleUpgrade = (knightId: string) => {
        if (!canAffordUpgrade()) return;
        startTransition(async () => {
            try {
                await onUpgradeKnight(knightId);
            } catch (error) {
                console.error('Failed to upgrade knight:', error);
            }
        });
    };

    const totalStrength = player.activeKnightCount ?? 0;

    return (
        <div className="bg-slate-800/90 p-4 rounded-lg shadow-lg text-white border border-slate-700 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Knights
                </h3>
                <div className="text-xs text-slate-400">
                    Strength: <span className="text-white font-bold">{totalStrength}</span>
                </div>
            </div>

            {/* Build Knight Button */}
            <button
                onClick={handleBuild}
                disabled={!canAffordKnight() || isPending}
                className={`w-full mb-3 text-sm py-2 px-3 rounded font-medium transition-colors ${
                    canAffordKnight()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isPending ? 'Building...' : `Build Knight (🐑 ${KNIGHT_COST.sheep} + 🪨 ${KNIGHT_COST.ore})`}
            </button>

            {/* Knight List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {player.knights.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-4">
                        No knights built yet
                    </div>
                ) : (
                    player.knights.map(knight => {
                        const isSelected = selectedKnight === knight.id;
                        const canUpgrade = knight.level !== 'mighty';

                        return (
                            <div
                                key={knight.id}
                                className={`p-2 rounded border transition-colors ${
                                    isSelected
                                        ? 'border-yellow-500 bg-slate-700'
                                        : 'border-slate-600 bg-slate-900/50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`text-lg ${knight.active ? '' : 'opacity-50'}`}>
                                            🛡️
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">
                                                {KNIGHT_LEVEL_LABELS[knight.level]} Knight
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                Strength: {KNIGHT_LEVEL_STRENGTH[knight.level]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-xs px-2 py-0.5 rounded ${
                                        knight.active
                                            ? 'bg-green-600/20 text-green-400'
                                            : 'bg-slate-600/20 text-slate-400'
                                    }`}>
                                        {knight.active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                    {!knight.active && (
                                        <button
                                            onClick={() => handleActivate(knight.id)}
                                            disabled={!canAffordActivation() || isPending}
                                            className={`flex-1 text-xs py-1 px-2 rounded transition-colors ${
                                                canAffordActivation()
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            }`}
                                        >
                                            Activate (🌾 1)
                                        </button>
                                    )}
                                    {knight.active && (
                                        <button
                                            onClick={() => handleMove(knight.id)}
                                            disabled={isPending}
                                            className="flex-1 text-xs py-1 px-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                        >
                                            Move
                                        </button>
                                    )}
                                    {canUpgrade && (
                                        <button
                                            onClick={() => handleUpgrade(knight.id)}
                                            disabled={!canAffordUpgrade() || isPending}
                                            className={`flex-1 text-xs py-1 px-2 rounded transition-colors ${
                                                canAffordUpgrade()
                                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            }`}
                                        >
                                            Upgrade
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
