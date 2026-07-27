import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { claimAqueductResource } from '@/app/actions';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';
import { CARD_LABELS, CardTokenGroup } from '@/components/game/ui/CardToken';

interface AqueductModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const AqueductModal: React.FC<AqueductModalProps> = ({ gameState, playerId }) => {
    const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const player = gameState.players.find(p => p.id === playerId);
    const playerResources = player?.resources || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    const handleClaim = async () => {
        if (!selectedResource || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await claimAqueductResource(gameState.roomId, playerId, selectedResource);
        } catch (e) {
            // A failure used to leave the button un-pressed with no explanation.
            console.error('Failed to claim aqueduct resource', e);
            setError(e instanceof Error ? e.message : 'Could not claim that resource');
            setIsSubmitting(false);
        }
    };

    return (
        <TabletopModal
            title={<span className="flex items-center gap-2"><TabletopStatusIcon type="info" size={22} /> Aqueduct Triggered</span>}
            description="You received no production this turn. Choose 1 resource from the bank."
            footer={(
                <TabletopButton variant="primary" onClick={handleClaim} disabled={!selectedResource || isSubmitting} className="w-full">
                    {isSubmitting ? 'Claiming...' : 'Claim Resource'}
                </TabletopButton>
            )}
        >
                <div className="mb-4 text-center text-sm text-[var(--ui-muted)]">
                    Counts are what you already hold.
                </div>

                {/* The bank always has every resource, so nothing here is ever
                    disabled — this is a plain five-way choice. */}
                <CardTokenGroup
                    label="Resource to claim"
                    items={RESOURCE_TYPES.map(res => ({
                        type: res,
                        count: playerResources[res],
                        ariaLabel: `Claim ${CARD_LABELS[res]}, you have ${playerResources[res]}`,
                    }))}
                    selected={selectedResource}
                    onSelect={type => { setSelectedResource(type as ResourceType); setError(null); }}
                />

                {error && (
                    <div
                        role="alert"
                        className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--ui-danger)] bg-[color-mix(in_oklab,var(--ui-danger)_12%,var(--ui-panel-solid))] px-3 py-2"
                    >
                        <TabletopStatusIcon type="cancel" size={16} className="mt-0.5 shrink-0" />
                        <span className="text-sm text-[var(--ui-text)]">{error}</span>
                    </div>
                )}
        </TabletopModal>
    );
};
