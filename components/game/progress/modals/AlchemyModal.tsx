import { useState } from 'react';
import { tabletopOptionClass } from '@/components/game/ui/TabletopModal';
import { EventDie, PipDie } from '@/themes/tabletop';
import { ProgressCardDialog } from './ProgressCardDialog';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

const RED_DIE = { body: '#b3352c', pip: '#f3e9cf' };
const YELLOW_DIE = { body: '#d9a72e', pip: '#3a3020' };
const DIE_FACES = [1, 2, 3, 4, 5, 6];

function DiePicker({
    label,
    colors,
    value,
    onChange,
}: {
    label: string;
    colors: { body: string; pip: string };
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
                {label}
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
                {DIE_FACES.map(face => (
                    <button
                        key={face}
                        type="button"
                        role="radio"
                        aria-checked={value === face}
                        aria-label={`${label} ${face}`}
                        onClick={() => onChange(face)}
                        className={`cursor-pointer rounded-lg border p-1 transition ${tabletopOptionClass(value === face)}`}
                    >
                        <PipDie
                            value={face}
                            body={colors.body}
                            pip={colors.pip}
                            size={32}
                            title={`${face}`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

export function AlchemyModal({
    gameState,
    currentPlayer,
    onClose,
    onPlay,
}: ProgressCardModalContentProps) {
    const [redDie, setRedDie] = useState(0);
    const [yellowDie, setYellowDie] = useState(0);
    const [isRevealing, setIsRevealing] = useState(false);
    const { error, setError, playAndClose } = useModalPlay(
        'alchemist',
        onPlay,
        onClose
    );
    const locked = gameState.phase !== 'waiting_for_roll';
    const pendingAlchemy =
        gameState.pendingAlchemy?.playerId === currentPlayer.id
            ? gameState.pendingAlchemy
            : null;
    const diceReady = redDie > 0 && yellowDie > 0;
    const total = redDie + yellowDie;

    const revealEventDie = async () => {
        if (isRevealing) return;
        setError('');
        setIsRevealing(true);
        try {
            await onPlay('alchemist', { revealEventDie: true });
        } catch (revealError: unknown) {
            setError(
                revealError instanceof Error
                    ? revealError.message
                    : 'Failed to reveal the event die'
            );
        } finally {
            setIsRevealing(false);
        }
    };

    const resolveAlchemy = () =>
        playAndClose({ chosenDice1: redDie, chosenDice2: yellowDie });

    return (
        <ProgressCardDialog
            cardType="alchemist"
            onCancel={onClose}
            onPrimary={pendingAlchemy ? resolveAlchemy : revealEventDie}
            primaryLabel={
                pendingAlchemy
                    ? 'Resolve Alchemy'
                    : isRevealing
                      ? 'Rolling…'
                      : 'Roll Event Die'
            }
            primaryDisabled={
                locked || isRevealing || (Boolean(pendingAlchemy) && !diceReady)
            }
            closeEnabled={!pendingAlchemy && !isRevealing}
            showCancel={!pendingAlchemy && !isRevealing}
            error={error}
        >
            {pendingAlchemy ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2">
                        <EventDie
                            face={pendingAlchemy.eventDieFace}
                            size={48}
                            title="Alchemy event die result"
                        />
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
                                Event die
                            </div>
                            <div className="font-semibold capitalize text-[var(--ui-text)]">
                                {pendingAlchemy.eventDieFace}
                            </div>
                            <div className="text-xs text-amber-200">
                                Result locked — choose both production dice.
                            </div>
                        </div>
                    </div>
                    <DiePicker
                        label="Red Die"
                        colors={RED_DIE}
                        value={redDie}
                        onChange={setRedDie}
                    />
                    <DiePicker
                        label="Yellow Die"
                        colors={YELLOW_DIE}
                        value={yellowDie}
                        onChange={setYellowDie}
                    />
                    {diceReady ? (
                        <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-sm">
                            Production roll:{' '}
                            <span className="font-semibold text-emerald-300">{total}</span>
                            {total === 7 ? (
                                <span className="ml-2 text-amber-200">
                                    — a 7 moves the robber instead of producing.
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-3 text-sm text-[var(--ui-text)]">
                    <p>
                        Roll the event die first. After its result is revealed,
                        Alchemy is committed and you must choose both production dice.
                    </p>
                    <p className="text-xs text-[var(--ui-muted)]">
                        You can cancel now, before revealing the event die.
                    </p>
                </div>
            )}
            {locked ? (
                <div className="mt-4 rounded border border-amber-500 bg-amber-900/30 p-3 text-sm text-amber-200">
                    Alchemy can only be played before rolling dice. Wait until the
                    start of your turn.
                </div>
            ) : null}
        </ProgressCardDialog>
    );
}
