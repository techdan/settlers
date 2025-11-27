'use client';

import React, { useState } from 'react';
import { GameState, PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { CK_CONSTANTS, KNIGHT_ACTIVATION_COST, KNIGHT_UPGRADE_COST } from '@/core/rules/commodity-constants';
import { canAffordKnightActivation, canAffordKnightUpgrade } from '@/core/validation/knight-validator';
import { getKnightOwner } from '@/core/validation/knight-validator';

interface KnightManagementDialogProps {
    gameState: GameState;
    playerId: string;
    knightId: string;
    onClose: () => void;
    onActivate: (knightId: string) => Promise<void>;
    onUpgrade: (knightId: string) => Promise<void>;
    onMove: (knightId: string) => void; // Enter move mode
    onChaseRobber: (knightId: string) => void; // Enter chase mode
}

export const KnightManagementDialog: React.FC<KnightManagementDialogProps> = ({
    gameState,
    playerId,
    knightId,
    onClose,
    onActivate,
    onUpgrade,
    onMove,
    onChaseRobber
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const player = gameState.players.find(p => p.id === playerId);

    // Find the knight
    let knight: Knight | undefined;
    if (player?.knights) {
        knight = player.knights.find(k => k.id === knightId);
    }

    if (!player || !knight) return null;

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting;

    const handleActivate = async () => {
        if (!canAct) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onActivate(knightId);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to activate knight');
            setIsSubmitting(false);
        }
    };

    const handleUpgrade = async () => {
        if (!canAct) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onUpgrade(knightId);
            // Don't close, allow further actions? Or close?
            // Upgrading doesn't necessarily end interaction.
            setIsSubmitting(false);
        } catch (e: any) {
            setError(e.message || 'Failed to upgrade knight');
            setIsSubmitting(false);
        }
    };

    const handleMove = () => {
        if (!canAct) return;
        onMove(knightId);
        onClose();
    };

    // Check capabilities
    const canAffordActivate = canAffordKnightActivation(player);
    const canAffordUpgrade = canAffordKnightUpgrade(player);
    const isMaxLevel = knight.level === 'mighty';

    // Check if can chase robber (robber must be on adjacent hex)
    // This requires hex adjacency logic which might be complex to check here.
    // For now, we'll assume the parent component or a validator handles the "can chase" check
    // or we just show the button and let the action fail if invalid.
    // But ideally we disable it if no robber is adjacent.
    // We'll leave it enabled for now if active.

    const strength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border-2 border-slate-600 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Knight Management
                    </h2>
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

                <div className="space-y-6">
                    {/* Knight Status */}
                    <div className="bg-slate-700/50 p-4 rounded border border-slate-600 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white capitalize text-lg">
                                {knight.level} Knight
                            </div>
                            <div className="text-sm text-slate-400">
                                Strength: {strength}
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded font-bold ${knight.active ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                            {knight.active ? 'Active' : 'Inactive'}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* Activate */}
                        {!knight.active && (
                            <button
                                onClick={handleActivate}
                                disabled={!canAct || !canAffordActivate}
                                className={`
                                    w-full py-3 rounded font-bold flex items-center justify-between px-4 transition-all
                                    ${canAct && canAffordActivate
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                <span>Activate</span>
                                <div className="flex items-center gap-1 bg-black/20 px-2 rounded text-sm">
                                    <span>1</span>
                                    <span>🌾</span>
                                </div>
                            </button>
                        )}

                        {/* Upgrade */}
                        {!isMaxLevel && (
                            <button
                                onClick={handleUpgrade}
                                disabled={!canAct || !canAffordUpgrade}
                                className={`
                                    w-full py-3 rounded font-bold flex items-center justify-between px-4 transition-all
                                    ${canAct && canAffordUpgrade
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                <span>Upgrade</span>
                                <div className="flex items-center gap-1 bg-black/20 px-2 rounded text-sm">
                                    <span>1 🐑 + 1 🪨</span>
                                </div>
                            </button>
                        )}

                        {/* Move */}
                        {knight.active && (
                            <button
                                onClick={handleMove}
                                disabled={!canAct}
                                className={`
                                    w-full py-3 rounded font-bold flex items-center justify-center transition-all
                                    ${canAct
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                Move Knight
                            </button>
                        )}

                        {/* Chase Robber - Placeholder for now */}
                        {knight.active && (
                            <button
                                onClick={() => onChaseRobber(knightId)}
                                disabled={!canAct} // TODO: Add check for adjacent robber
                                className={`
                                    w-full py-3 rounded font-bold flex items-center justify-center transition-all
                                    ${canAct
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                Chase Robber
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
