import React, { useState, useTransition } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { discardCards } from '@/app/actions';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';
import { TabletopResourceIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '../ui/TabletopModal';

interface DiscardModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_ORDER: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const INITIAL_SELECTION: Record<ResourceType, number> = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

function selectionsEqual(a: Record<ResourceType, number>, b: Record<ResourceType, number>): boolean {
    return RESOURCE_ORDER.every(res => a[res] === b[res]);
}

function normalizeResources(resources?: Record<ResourceType, number>): Record<ResourceType, number> {
    return RESOURCE_ORDER.reduce((acc, res) => {
        const value = resources?.[res];
        acc[res] = Number.isFinite(value) ? Math.max(0, value as number) : 0;
        return acc;
    }, { ...INITIAL_SELECTION });
}

export const DiscardModal: React.FC<DiscardModalProps> = ({ gameState, playerId }) => {
    const player = gameState.players.find(p => p.id === playerId);
    const [selected, setSelected] = useState<Record<ResourceType, number>>(INITIAL_SELECTION);
    const [isPending, startTransition] = useTransition();
    const discardContext = gameState.discardContext;
    const isSabotage = discardContext?.type === 'sabotage';
    const isTarget = isSabotage ? discardContext.targetIds?.includes(playerId) : true;

    const safeResources = React.useMemo(
        () => normalizeResources(player?.resources),
        [
            player?.resources?.wood,
            player?.resources?.brick,
            player?.resources?.sheep,
            player?.resources?.wheat,
            player?.resources?.ore,
            player?.id
        ]
    );

    const totalResources = React.useMemo(
        () => RESOURCE_ORDER.reduce((sum, res) => sum + safeResources[res], 0),
        [safeResources]
    );
    const discardThreshold = React.useMemo(
        () => (player ? getRobberDiscardThreshold(gameState, playerId) : 7),
        [gameState, player?.id, playerId]
    );
    const requiredDiscard = React.useMemo(() => {
        if (!player) return 0;
        if (!isTarget) return 0;
        if (isSabotage) return Math.max(0, Math.floor(totalResources / 2));
        if (totalResources <= discardThreshold) return 0;
        return Math.max(0, Math.floor(totalResources / 2));
    }, [discardThreshold, isSabotage, isTarget, player, totalResources]);

    // Reset/clamp selection whenever discard phase changes or resources update to avoid stale/negative counts.
    React.useEffect(() => {
        if (!player) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        if (gameState.phase !== 'discarding' || player.discardedThisTurn) {
            setSelected(prev => (selectionsEqual(prev, INITIAL_SELECTION) ? prev : INITIAL_SELECTION));
            return;
        }

        setSelected(prev => {
            const next = { ...prev };
            let changed = false;

            // Clamp to available resources
            RESOURCE_ORDER.forEach(res => {
                const max = safeResources[res];
                if (next[res] > max) {
                    next[res] = max;
                    changed = true;
                }
                if (next[res] < 0) {
                    next[res] = 0;
                    changed = true;
                }
            });

            // Prevent selecting more than required discard after clamping
            const totalSelected = RESOURCE_ORDER.reduce((sum, res) => sum + next[res], 0);
            if (requiredDiscard > 0 && totalSelected > requiredDiscard) {
                let excess = totalSelected - requiredDiscard;
                for (const res of RESOURCE_ORDER) {
                    if (excess === 0) break;
                    const reducible = Math.min(next[res], excess);
                    if (reducible > 0) {
                        next[res] -= reducible;
                        excess -= reducible;
                        changed = true;
                    }
                }
            }

            return changed ? next : prev;
        });
    }, [
        gameState.phase,
        player?.id,
        player?.discardedThisTurn,
        safeResources.wood,
        safeResources.brick,
        safeResources.sheep,
        safeResources.wheat,
        safeResources.ore,
        requiredDiscard
    ]);

    if (!player || gameState.phase !== 'discarding') return null;

    if (requiredDiscard === 0 || player.discardedThisTurn) {
        // Show waiting message if others are discarding
        return (
            <TabletopModal title="Waiting for Discards">
                <p className="text-center text-[var(--ui-muted)]">Waiting for other players to discard half their cards...</p>
            </TabletopModal>
        );
    }

    const currentSelected = RESOURCE_ORDER.reduce((sum, res) => sum + selected[res], 0);

    const handleIncrement = (res: ResourceType) => {
        const max = safeResources[res];
        if (selected[res] < max && currentSelected < requiredDiscard) {
            setSelected(prev => ({ ...prev, [res]: prev[res] + 1 }));
        }
    };

    const handleDecrement = (res: ResourceType) => {
        if (selected[res] > 0) {
            setSelected(prev => ({ ...prev, [res]: prev[res] - 1 }));
        }
    };

    const handleConfirm = () => {
        if (currentSelected !== requiredDiscard) return;

        startTransition(async () => {
            try {
                await discardCards(gameState.roomId, playerId, selected);
            } catch (e) {
                console.error("Failed to discard", e);
            }
        });
    };

    const heading = isSabotage ? 'Sabotage!' : 'Robber Attack!';

    return (
        <TabletopModal
            title={heading}
            width="lg"
            backdropBlur={false}
            footer={(
                <TabletopButton
                    variant="danger"
                    onClick={handleConfirm}
                    disabled={currentSelected !== requiredDiscard || isPending}
                    className="w-full"
                >
                    {isPending ? 'Discarding...' : 'Confirm Discard'}
                </TabletopButton>
            )}
        >
                <p className="mb-6 text-center text-[var(--ui-muted)]">
                    You have {totalResources} cards. You must discard <span className="font-bold text-white">{requiredDiscard}</span> cards.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {(RESOURCE_ORDER as ResourceType[]).map(res => {
                        const max = safeResources[res];
                        if (max === 0) return null;

                        return (
                            <div key={res} className="flex flex-col items-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] p-3">
                                <TabletopResourceIcon type={res} size={30} label={res} />
                                <div className="mb-2 text-sm font-semibold capitalize text-[var(--ui-text)]">{res}</div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDecrement(res)}
                                        disabled={selected[res] === 0}
                                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] font-bold text-[var(--ui-text)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                                    >-</button>
                                    <span className="font-bold w-4 text-center text-white">{selected[res]}</span>
                                    <button
                                        onClick={() => handleIncrement(res)}
                                        disabled={selected[res] === max || currentSelected >= requiredDiscard}
                                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-[var(--ui-border)] bg-[var(--ui-panel-solid)] font-bold text-[var(--ui-text)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                                    >+</button>
                                </div>
                                <div className={`mt-1 text-xs font-semibold ${selected[res] > 0 ? 'text-red-300' : 'text-[var(--ui-muted)]'}`}>
                                    Have: {max - selected[res]}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="text-lg font-bold text-white">
                        Selected: <span className={currentSelected === requiredDiscard ? "text-green-400" : "text-yellow-400"}>
                            {currentSelected}
                        </span> / {requiredDiscard}
                    </div>

                </div>
        </TabletopModal>
    );
};
