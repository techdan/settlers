'use client';

import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { isValidMainPhaseCity } from '@/core/validation/building-validator';
import { BUILDING_COSTS, canAfford } from '@/core/rules/building-costs';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimerState } from '@/lib/hooks/useTimerState';
import { City, TabletopResourceIcon } from '@/themes/tabletop';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

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

    // Check timer status
    const timerStatus = useTimerState(gameState);

    const player = gameState.players.find(p => p.id === playerId);
    const vertex = gameState.board.vertices[vertexId];

    if (!player || !vertex || vertex.structure !== 'settlement' || vertex.owner !== playerId) {
        return null;
    }

    const isMyTurn = gameState.currentTurn === playerId;
    const isMainPhase = gameState.phase === 'main_phase';
    const canAct = isMyTurn && isMainPhase && !isSubmitting && !timerStatus.isLocked;

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
        <TabletopModal title="Settlement Management" onClose={onClose}>
                {error && (
                    <div className="mb-4 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_14%,var(--ui-panel-solid))] p-3 text-[var(--ui-text)]">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Upgrade to City */}
                    <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <Tooltip
                                    content="Upgrade to City - Doubles production from adjacent hexes.\n\nCost: 2 Wheat + 3 Ore\n\nIncreases the settlement's victory point value from 1 to 2."
                                    placement="left"
                                    tooltipClassName="whitespace-pre-line"
                                >
                                    <div className="flex h-12 w-12 cursor-default items-center justify-center rounded-full bg-[var(--ui-panel-solid)]">
                                        <svg viewBox="-18 -22 36 38" width="44" height="44" aria-hidden="true">
                                            <City color={player.color} />
                                        </svg>
                                    </div>
                                </Tooltip>
                                <div>
                                    <div className="text-lg font-bold text-[var(--ui-text)]">
                                        Upgrade to City
                                    </div>
                                    <div className="text-sm text-[var(--ui-muted)]">
                                        Worth 2 Victory Points
                                    </div>
                                </div>
                            </div>
                        </div>

                        <TabletopButton
                            variant="primary"
                            onClick={handleUpgradeToCity}
                            disabled={!canAct || !canUpgrade}
                            className="mt-3 flex w-full items-center justify-between py-3"
                        >
                            <span>Upgrade to City</span>
                            <div className="flex items-center gap-2 rounded bg-black/15 px-3 py-1 text-sm">
                                <span className="flex items-center gap-1"><span>2</span><TabletopResourceIcon type="wheat" size={20} label="wheat" /></span>
                                <span>+</span>
                                <span className="flex items-center gap-1"><span>3</span><TabletopResourceIcon type="ore" size={20} label="ore" /></span>
                            </div>
                        </TabletopButton>

                        {!canUpgrade && (
                            <div className="mt-2 text-center text-xs text-[var(--ui-muted)]">
                                {wheat < 2 || ore < 3
                                    ? `You need ${Math.max(0, 2 - wheat)} more wheat and ${Math.max(0, 3 - ore)} more ore`
                                    : 'Cannot upgrade at this time'}
                            </div>
                        )}
                    </div>
                </div>
        </TabletopModal>
    );
};
