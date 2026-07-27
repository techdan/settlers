import { useState } from 'react';
import {
    GuildSelectionList,
    getSelectionCount,
    type SelectionMap,
} from '../../city/GuildSelectionList';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { ProgressCardDialog } from './ProgressCardDialog';
import {
    getOpponentHandCounts,
    getOpponentHandSize,
} from './card-modal-helpers';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

export function GuildDuesModal({
    gameState,
    currentPlayer,
    onClose,
    onPlay,
}: ProgressCardModalContentProps) {
    const [opponentId, setOpponentId] = useState('');
    const [selections, setSelections] = useState<SelectionMap>({});
    const [committed, setCommitted] = useState(false);
    const { error, setError, playAndClose } = useModalPlay(
        'guild_dues',
        onPlay,
        onClose
    );
    const eligibleOpponents = gameState.players.filter(
        player =>
            player.id !== currentPlayer.id &&
            player.victoryPoints > currentPlayer.victoryPoints
    );
    const opponent = gameState.players.find(player => player.id === opponentId);
    const totalAvailable = committed
        ? getOpponentHandSize(gameState, opponentId)
        : 0;
    const requiredPicks =
        totalAvailable === 0 ? 0 : Math.min(2, totalAvailable);
    const selectedCount = getSelectionCount(selections);
    const ready =
        committed &&
        Boolean(opponentId) &&
        requiredPicks > 0 &&
        selectedCount === requiredPicks;

    const selectOpponent = () => {
        if (!opponentId) {
            setError('Please select an opponent');
            return;
        }
        if (getOpponentHandSize(gameState, opponentId) === 0) {
            setError('Selected opponent has no cards');
            return;
        }
        setCommitted(true);
        setError('');
    };

    const confirm = () => {
        if (!opponentId) {
            setError('Please select an opponent with more VPs than you.');
            return;
        }
        const selectionsArray = Object.entries(selections).flatMap(
            ([key, count]) => {
                const [type, value] = key.split(':');
                return Array.from({ length: count }, () => ({ type, value }));
            }
        );
        if (selectionsArray.length !== requiredPicks) {
            setError(
                requiredPicks === 1
                    ? 'Select 1 card to take.'
                    : 'Select 2 cards to take.'
            );
            return;
        }
        return playAndClose({
            opponentId,
            card1Type: selectionsArray[0].type,
            card1Value: selectionsArray[0].value,
            ...(selectionsArray[1]
                ? {
                      card2Type: selectionsArray[1].type,
                      card2Value: selectionsArray[1].value,
                  }
                : {}),
        });
    };

    const tooltip = committed && !ready
        ? requiredPicks === 0
            ? 'Opponent has no cards to take'
            : requiredPicks === 1
              ? 'Select 1 resource or commodity'
              : 'Select 2 resources or commodities'
        : undefined;

    return (
        <ProgressCardDialog
            cardType="guild_dues"
            onCancel={onClose}
            onPrimary={committed ? confirm : selectOpponent}
            primaryLabel={committed ? 'Take Cards' : 'Select'}
            primaryDisabled={committed ? !ready : !opponentId}
            primaryTooltip={tooltip}
            closeEnabled={!committed}
            error={error}
        >
            <div className="space-y-4">
                {!committed ? (
                    <>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Select opponent (must have more VPs than you):
                            </label>
                            <select
                                value={opponentId}
                                onChange={event => {
                                    setOpponentId(event.target.value);
                                    setSelections({});
                                    setError('');
                                }}
                                className="w-full cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
                            >
                                <option value="">Select opponent</option>
                                {eligibleOpponents.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name} ({player.victoryPoints} VP,{' '}
                                        {getOpponentHandSize(gameState, player.id)} cards)
                                    </option>
                                ))}
                            </select>
                            {eligibleOpponents.length === 0 ? (
                                <p className="mt-1 text-xs text-amber-300">
                                    No opponents have more victory points than you.
                                </p>
                            ) : null}
                        </div>
                        <div className="rounded border border-amber-600 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                            <TabletopStatusIcon type="warning" size={16} /> Once you
                            click &quot;Select&quot;, you cannot cancel and must take
                            cards from this opponent&apos;s hand.
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-2 text-sm text-[var(--ui-text)]">
                            Taking from:{' '}
                            <span className="font-semibold text-emerald-300">
                                {opponent?.name}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {requiredPicks > 0 ? (
                                <div className="text-sm text-[var(--ui-text)]">
                                    Choose{' '}
                                    {requiredPicks === 2
                                        ? 'any 2 cards'
                                        : 'the only card available'}{' '}
                                    from {opponent?.name}&apos;s hand.
                                </div>
                            ) : (
                                <div className="text-sm text-amber-200">
                                    This opponent has no cards to take.
                                </div>
                            )}
                            <GuildSelectionList
                                items={getOpponentHandCounts(gameState, opponentId)}
                                required={requiredPicks}
                                selections={selections}
                                onChange={next => {
                                    setSelections(next);
                                    setError('');
                                }}
                                emptyMessage="Opponent has no resources or commodities to take."
                            />
                        </div>
                    </>
                )}
            </div>
        </ProgressCardDialog>
    );
}
