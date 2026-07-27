import { useState } from 'react';
import { PROGRESS_CARD_DEFINITIONS } from '@/core/engine/progress/progress-card-definitions';
import { Tooltip } from '@/components/ui/tooltip';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import type { ProgressCardType } from '@/lib/types/player';
import { ProgressCardDialog } from './ProgressCardDialog';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

const CATEGORY_ICONS = {
    science: '🟢',
    trade: '🟡',
    politics: '🔵',
};

export function EspionageModal({
    gameState,
    currentPlayer,
    onClose,
    onPlay,
}: ProgressCardModalContentProps) {
    const [opponentId, setOpponentId] = useState('');
    const [stolenCard, setStolenCard] = useState<ProgressCardType | ''>('');
    const [committed, setCommitted] = useState(false);
    const { error, setError, playAndClose } = useModalPlay(
        'espionage',
        onPlay,
        onClose
    );
    const opponents = gameState.players.filter(
        player => player.id !== currentPlayer.id
    );
    const opponent = gameState.players.find(player => player.id === opponentId);
    const opponentCards = opponent?.progressCards ?? [];
    const ready = committed && Boolean(opponentId) && Boolean(stolenCard);

    const selectOpponent = () => {
        if (!opponentId) {
            setError('Please select an opponent');
            return;
        }
        if (opponentCards.length === 0) {
            setError('Selected opponent has no progress cards');
            return;
        }
        setCommitted(true);
        setError('');
    };

    const confirm = () => {
        if (!opponentId || !stolenCard) {
            setError('Please select an opponent and a card to steal');
            return;
        }
        return playAndClose({ opponentId, stolenCard });
    };

    return (
        <ProgressCardDialog
            cardType="espionage"
            onCancel={onClose}
            onPrimary={committed ? confirm : selectOpponent}
            primaryLabel={committed ? 'Steal Card' : 'Select'}
            primaryDisabled={committed ? !ready : !opponentId}
            primaryTooltip={
                committed && !ready
                    ? 'Select a progress card to steal'
                    : undefined
            }
            closeEnabled={!committed}
            error={error}
        >
            <div className="space-y-4">
                {!committed ? (
                    <>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Select opponent:
                            </label>
                            <select
                                value={opponentId}
                                onChange={event => setOpponentId(event.target.value)}
                                className="w-full cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-[var(--ui-text)]"
                            >
                                <option value="">Select opponent</option>
                                {opponents.map(player => {
                                    const cardCount =
                                        player.progressCards?.length ?? 0;
                                    return (
                                        <option key={player.id} value={player.id}>
                                            {player.name} ({cardCount} card
                                            {cardCount === 1 ? '' : 's'})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="rounded border border-amber-600 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                            <TabletopStatusIcon type="warning" size={16} /> Once you
                            click &quot;Select&quot;, you cannot cancel and must
                            steal a progress card from this opponent.
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-2 text-sm text-[var(--ui-text)]">
                            Stealing from:{' '}
                            <span className="font-semibold text-emerald-300">
                                {opponent?.name}
                            </span>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Select card to steal:
                            </label>
                            {opponentCards.length === 0 ? (
                                <div className="rounded border border-amber-600 bg-amber-900/30 px-3 py-2 text-sm text-amber-200">
                                    This opponent has no progress cards to steal.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {opponentCards.map((card, index) => {
                                        const metadata =
                                            PROGRESS_CARD_DEFINITIONS[card];
                                        const selected = stolenCard === card;
                                        return (
                                            <Tooltip
                                                key={`${card}-${index}`}
                                                content={metadata.description}
                                                placement="left"
                                                tooltipClassName="whitespace-pre-line"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setStolenCard(card)}
                                                    className={`w-full cursor-pointer rounded border px-4 py-3 text-left transition-colors ${
                                                        selected
                                                            ? 'border-blue-400 bg-blue-600/60 ring-2 ring-blue-400'
                                                            : 'border-[var(--ui-border)] bg-[var(--ui-panel-raised)] hover:border-[var(--ui-accent)] hover:brightness-110'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">
                                                            {CATEGORY_ICONS[
                                                                metadata.category
                                                            ]}
                                                        </span>
                                                        <span className="font-semibold text-white">
                                                            {metadata.name}
                                                        </span>
                                                    </div>
                                                </button>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </ProgressCardDialog>
    );
}
