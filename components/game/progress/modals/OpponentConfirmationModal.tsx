import { ProgressCardDialog } from './ProgressCardDialog';
import {
    getOpponentHandSize,
    getOpponentResourceCount,
} from './card-modal-helpers';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

interface OpponentConfirmationModalProps
    extends ProgressCardModalContentProps {
    cardType: 'saboteur' | 'wedding';
}

export function OpponentConfirmationModal({
    cardType,
    gameState,
    currentPlayer,
    onClose,
    onPlay,
}: OpponentConfirmationModalProps) {
    const { error, playAndClose } = useModalPlay(cardType, onPlay, onClose);
    const isSaboteur = cardType === 'saboteur';
    const opponents = gameState.players.filter(
        player => player.id !== currentPlayer.id
    );
    const higherVPOpponents = opponents.filter(
        player =>
            (player.victoryPoints ?? 0) >= (currentPlayer.victoryPoints ?? 0)
    );
    const blocked = higherVPOpponents.length === 0;

    return (
        <ProgressCardDialog
            cardType={cardType}
            onCancel={onClose}
            onPrimary={() => playAndClose({})}
            primaryLabel="Play Card"
            primaryDisabled={blocked}
            primaryTooltip={
                blocked ? 'No opponents have more victory points' : undefined
            }
            error={error}
        >
            <div className="space-y-3">
                <p className="text-sm text-[var(--ui-text)]">
                    {isSaboteur ? (
                        <>
                            All opponents with equal or more victory points must
                            discard half of their{' '}
                            <span className="font-semibold text-emerald-300">
                                resource cards
                            </span>{' '}
                            (rounded down), just like a 7 roll.
                        </>
                    ) : (
                        <>
                            Each opponent with more victory points chooses{' '}
                            <span className="font-semibold text-emerald-300">
                                two cards
                            </span>{' '}
                            (resources or commodities) to give you. They will make
                            their selection right after you play this card.
                        </>
                    )}
                </p>
                <div className="space-y-2">
                    {opponents.map(opponent => {
                        const affected = isSaboteur
                            ? (opponent.victoryPoints ?? 0) >=
                              (currentPlayer.victoryPoints ?? 0)
                            : (opponent.victoryPoints ?? 0) >
                              (currentPlayer.victoryPoints ?? 0);
                        const cardCount = isSaboteur
                            ? getOpponentResourceCount(gameState, opponent.id)
                            : getOpponentHandSize(gameState, opponent.id);
                        const owed = isSaboteur
                            ? Math.floor(cardCount / 2)
                            : Math.min(2, cardCount);

                        return (
                            <div
                                key={opponent.id}
                                className="flex items-center justify-between rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2"
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold text-white">
                                        {opponent.name}
                                    </span>
                                    <span className="text-xs text-[var(--ui-muted)]">
                                        {opponent.victoryPoints} VP
                                    </span>
                                </div>
                                <div className="text-right text-sm">
                                    {affected ? (
                                        cardCount > 0 ? (
                                            <span className="font-semibold text-emerald-300">
                                                {isSaboteur
                                                    ? `Discards ${owed} / ${cardCount} resources`
                                                    : `Will give ${owed} card${owed === 1 ? '' : 's'} (${cardCount} in hand)`}
                                            </span>
                                        ) : (
                                            <span className="text-amber-200">
                                                Ahead of you but has no{' '}
                                                {isSaboteur ? 'resources' : 'cards'}
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-[var(--ui-muted)]">
                                            {isSaboteur ? 'Not affected' : 'No cards owed'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {blocked ? (
                    <div className="rounded border border-amber-600 bg-amber-900/30 px-3 py-2 text-xs text-amber-300">
                        No opponents currently have{' '}
                        {isSaboteur ? 'equal or more' : 'more'} victory points.
                        Playing {isSaboteur ? 'Saboteur' : 'Wedding'} will have no
                        effect.
                    </div>
                ) : null}
            </div>
        </ProgressCardDialog>
    );
}
