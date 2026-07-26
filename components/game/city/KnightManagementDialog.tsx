'use client';

import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { Knight } from '@/lib/types/player';
import { CK_CONSTANTS } from '@/core/rules/commodity-constants';
import { canAffordKnightActivation, canAffordKnightUpgrade, isKnightAdjacentToRobber } from '@/core/validation/knight-validator';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { KnightPiece, TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface KnightManagementDialogProps {
    gameState: GameState;
    playerId: string;
    knightId: string;
    onClose: () => void;
    onActivate: (knightId: string) => Promise<void>;
    onUpgrade: (knightId: string) => Promise<void>;
    onMove: (knightId: string) => void; // Enter move mode
    onChaseRobber: (knightId: string) => Promise<void>;
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

    // Check timer status
    const timerStatus = useTimerState(gameState);

    const player = gameState.players.find(p => p.id === playerId);

    // Find the knight
    let knight: Knight | undefined;
    if (player?.knights) {
        knight = player.knights.find(k => k.id === knightId);
    }

    if (!player || !knight) return null;

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting && !timerStatus.isLocked;

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

    const handleChaseRobber = async () => {
        if (!canAct) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onChaseRobber(knightId);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to chase away robber');
            setIsSubmitting(false);
        }
    };

    // Check capabilities
    const canAffordActivate = canAffordKnightActivation(player);
    const canAffordUpgrade = canAffordKnightUpgrade(player);
    const isMaxLevel = knight.level === 'mighty';
    const strength = CK_CONSTANTS.KNIGHT_STRENGTH[knight.level];
    const isAdjacentToRobber = isKnightAdjacentToRobber(gameState, knight);
    const canChaseRobber = knight.active && isAdjacentToRobber && gameState.hasBarbariansAttacked;

    return (
        <TabletopModal title="Knight Management" onClose={onClose}>
                {error && (
                    <div className="mb-4 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_14%,var(--ui-panel-solid))] p-3 text-[var(--ui-text)]">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Knight Status */}
                    <div className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                        <div className="flex items-center gap-3">
                            <svg viewBox="-16 -16 32 32" width="48" height="48" aria-hidden="true">
                                <KnightPiece color={player.color} level={knight.level} active={knight.active} />
                            </svg>
                            <div>
                            <div className="text-lg font-bold capitalize text-[var(--ui-text)]">
                                {knight.level} Knight
                            </div>
                            <div className="text-sm text-[var(--ui-muted)]">
                                Strength: {strength}
                            </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-[var(--ui-text)]">
                            <TabletopStatusIcon type={knight.active ? 'active' : 'inactive'} size={18} />
                            {knight.active ? 'Active' : 'Inactive'}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* Activate */}
                        {!knight.active && (
                            <TabletopButton
                                variant="primary"
                                onClick={handleActivate}
                                disabled={!canAct || !canAffordActivate}
                                className="flex w-full items-center justify-between py-3"
                            >
                                <span>Activate</span>
                                <div className="flex items-center gap-1 rounded bg-black/15 px-2 text-sm">
                                    <span>1</span>
                                    <TabletopResourceIcon type="wheat" size={20} label="wheat" />
                                </div>
                            </TabletopButton>
                        )}

                        {/* Upgrade */}
                        {!isMaxLevel && (
                            <Tooltip
                                content={knight.level === 'strong' && (player.improvements?.politics || 0) < 3 ? "Requires Fortress (Politics Level 3)" : "Upgrade"}
                                placement="top"
                                tooltipClassName="whitespace-pre-line"
                            >
                                <TabletopButton
                                    variant="primary"
                                    onClick={handleUpgrade}
                                    disabled={!canAct || !canAffordUpgrade || (knight.level === 'strong' && (player.improvements?.politics || 0) < 3)}
                                    className="flex w-full items-center justify-between py-3"
                                >
                                    <span>Upgrade {(knight.level === 'strong' && (player.improvements?.politics || 0) < 3) ? '(Fortress required)' : ''}</span>
                                    <div className="flex items-center gap-1 rounded bg-black/15 px-2 text-sm">
                                        <span>1</span><TabletopResourceIcon type="sheep" size={20} label="sheep" />
                                        <span>+</span>
                                        <span>1</span><TabletopResourceIcon type="ore" size={20} label="ore" />
                                    </div>
                                </TabletopButton>
                            </Tooltip>
                        )}

                        {/* Move */}
                        {knight.active && (
                            <TabletopButton
                                variant="secondary"
                                onClick={handleMove}
                                disabled={!canAct}
                                className="w-full py-3"
                            >
                                Move Knight
                            </TabletopButton>
                        )}

                        {/* Chase Away Robber */}
                        {canChaseRobber && (
                            <TabletopButton
                                variant="danger"
                                onClick={handleChaseRobber}
                                disabled={!canAct}
                                className="w-full py-3"
                            >
                                Chase Away Robber
                            </TabletopButton>
                        )}

                    </div>
                </div>
        </TabletopModal>
    );
};
