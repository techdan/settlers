import React, { useState } from 'react';
import { GameState } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { claimAqueductResource } from '@/app/actions';
import { TabletopResourceIcon, TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton, TabletopModal, tabletopOptionClass } from '@/components/game/ui/TabletopModal';

interface AqueductModalProps {
    gameState: GameState;
    playerId: string;
}

const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const AqueductModal: React.FC<AqueductModalProps> = ({ gameState, playerId }) => {
    const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const player = gameState.players.find(p => p.id === playerId);
    const playerResources = player?.resources || { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

    const handleClaim = async () => {
        if (!selectedResource || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await claimAqueductResource(gameState.roomId, playerId, selectedResource);
        } catch (e) {
            console.error('Failed to claim aqueduct resource', e);
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
                <div className="mb-4 text-center text-sm text-[var(--ui-muted)]">Your current resources:</div>
                <div className="grid grid-cols-5 gap-2">
                    {RESOURCE_TYPES.map(res => (
                        <button
                            type="button"
                            key={res}
                            onClick={() => setSelectedResource(res)}
                            aria-pressed={selectedResource === res}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-all ${tabletopOptionClass(selectedResource === res)}`}
                        >
                            <TabletopResourceIcon type={res} size={30} label={res} />
                            <span className="text-xs capitalize text-[var(--ui-muted)]">{res}</span>
                            <span className="text-sm font-bold text-[var(--ui-text)]">{playerResources[res]}</span>
                        </button>
                    ))}
                </div>
        </TabletopModal>
    );
};
