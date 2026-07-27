import { useState, type FC } from 'react';
import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import {
    GuildSelectionList,
    getSelectionCount,
    type GuildSelectionItem,
    type SelectionMap
} from '../city/GuildSelectionList';
import { submitWeddingGiftsAction } from '@/app/actions';
import type { GameState, WeddingSelection } from '@/lib/types/game';
import type { PlayerState } from '@/lib/types/player';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface WeddingGiftModalProps {
    gameState: GameState;
    playerId: string;
    roomId: string;
}

function getAvailableItems(player: PlayerState): GuildSelectionItem[] {
    const entries: GuildSelectionItem[] = [];

    Object.entries(player.resources).forEach(([resource, available]) => {
        if (available > 0) {
            entries.push({
                type: 'resource',
                value: resource as ResourceType,
                available
            });
        }
    });

    Object.entries(player.commodities ?? {}).forEach(([commodity, available]) => {
        if (available > 0) {
            entries.push({
                type: 'commodity',
                value: commodity as CommodityType,
                available
            });
        }
    });

    return entries;
}

export const WeddingGiftModal: FC<WeddingGiftModalProps> = ({ gameState, playerId, roomId }) => {
    const wedding = gameState.pendingWedding;
    const request = wedding?.requests.find(r => r.playerId === playerId && r.status === 'pending');
    const initiator = wedding
        ? gameState.players.find(p => p.id === wedding.initiatorId)
        : undefined;
    const player = gameState.players.find(p => p.id === playerId);
    const [selections, setSelections] = useState<SelectionMap>({});
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!request || request.requiredCards <= 0 || !initiator || !player) return null;

    const availableItems = getAvailableItems(player);
    const required = request.requiredCards;
    const selectedCount = getSelectionCount(selections);

    const handleSubmit = async () => {
        if (selectedCount !== required) {
            setError(required === 1 ? 'Select 1 card to give.' : `Select ${required} cards to give.`);
            return;
        }

        const payload: WeddingSelection[] = Object.entries(selections).flatMap(([key, count]) => {
            const [type, value] = key.split(':');
            return Array.from({ length: count }, () => ({
                type: type as WeddingSelection['type'],
                value: value as ResourceType | CommodityType
            }));
        });

        setIsSubmitting(true);
        setError('');

        try {
            await submitWeddingGiftsAction(roomId, playerId, payload);
        } catch (caught: unknown) {
            setError(caught instanceof Error && caught.message
                ? caught.message
                : 'Failed to submit cards');
            setIsSubmitting(false);
        }
    };

    return (
        <TabletopModal
            title={`Give ${required} card${required === 1 ? '' : 's'} to ${initiator.name}`}
            description={`Wedding — You currently have more victory points than ${initiator.name}. Choose which cards to hand over.`}
            width="lg"
            footer={(
                <TabletopButton variant="primary" onClick={handleSubmit} disabled={isSubmitting || selectedCount !== required}>
                    {isSubmitting ? 'Submitting...' : 'Give Cards'}
                </TabletopButton>
            )}
        >
                <div className="space-y-3">
                    <div className="text-sm text-[var(--ui-text)]">
                        Select {required} resource or commodity card{required === 1 ? '' : 's'} to give.
                    </div>

                    <GuildSelectionList
                        items={availableItems}
                        required={required}
                        selections={selections}
                        onChange={(next) => {
                            setSelections(next);
                            setError('');
                        }}
                        emptyMessage="You have no resources or commodities to give."
                        summaryPrefix="You selected"
                    />

                    {error && (
                        <div
                            role="alert"
                            className="mt-2 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm"
                        >
                            {error}
                        </div>
                    )}
                </div>

        </TabletopModal>
    );
};
