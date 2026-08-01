import { useMemo, useState } from 'react';
import { canDrawProgressCard } from '@/core/engine/improvements/improvement-manager';
import type { EventDieFace } from '@/core/rules/commodity-constants';
import { getPlayerProductionPreview } from '@/core/engine/resources/production-preview';
import { tabletopOptionClass } from '@/components/game/ui/TabletopModal';
import { EventDie, PipDie } from '@/themes/tabletop';
import { ProgressCardDialog } from './ProgressCardDialog';
import { useModalPlay } from './useModalPlay';
import type { ProgressCardModalContentProps } from './types';

const RED_DIE = { body: '#b3352c', pip: '#f3e9cf' };
const YELLOW_DIE = { body: '#d9a72e', pip: '#3a3020' };
const DIE_FACES = [1, 2, 3, 4, 5, 6];
const EVENT_CATEGORY_LABELS: Record<Exclude<EventDieFace, 'ship'>, string> = {
    science: 'Science',
    trade: 'Trade',
    politics: 'Politics',
};

function formatPreview(values: Record<string, number>): string {
    return Object.entries(values)
        .filter(([, amount]) => amount > 0)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');
}

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
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
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
    const eventCategory: Exclude<EventDieFace, 'ship'> | null =
        pendingAlchemy && pendingAlchemy.eventDieFace !== 'ship'
            ? pendingAlchemy.eventDieFace
            : null;
    const improvementLevel = eventCategory
        ? currentPlayer.improvements?.[eventCategory] ?? 0
        : 0;
    const redDieThreshold = improvementLevel > 0
        ? Math.min(6, improvementLevel + 1)
        : 0;
    const willDrawProgressCard = eventCategory !== null && redDie > 0
        ? canDrawProgressCard(currentPlayer, eventCategory, redDie)
        : null;
    const productionPreview = useMemo(
        () => diceReady
            ? getPlayerProductionPreview(gameState, currentPlayer.id, total)
            : null,
        [currentPlayer.id, diceReady, gameState, total]
    );
    const resourcePreview = productionPreview
        ? formatPreview(productionPreview.resources) || 'none'
        : 'none';
    const commodityPreview = productionPreview
        ? formatPreview(productionPreview.commodities) || 'none'
        : 'none';

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

    const resolveAlchemy = () => {
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        return playAndClose({ chosenDice1: redDie, chosenDice2: yellowDie });
    };

    const chooseRedDie = (value: number) => {
        setRedDie(value);
        setIsConfirming(false);
    };

    const chooseYellowDie = (value: number) => {
        setYellowDie(value);
        setIsConfirming(false);
    };

    return (
        <ProgressCardDialog
            cardType="alchemist"
            onCancel={onClose}
            onPrimary={pendingAlchemy ? resolveAlchemy : revealEventDie}
            primaryLabel={
                pendingAlchemy
                    ? isConfirming
                        ? 'Resolve Alchemy'
                        : 'Confirm Selection'
                    : isRevealing
                      ? 'Rolling…'
                      : 'Roll Event Die'
            }
            primaryDisabled={
                locked || isRevealing || (Boolean(pendingAlchemy) && !diceReady)
            }
            closeEnabled={!pendingAlchemy && !isRevealing}
            showCancel={!pendingAlchemy && !isRevealing}
            collapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(collapsed => !collapsed)}
            expanded={isConfirming}
            secondaryLabel={pendingAlchemy && isConfirming ? 'Change' : undefined}
            onSecondary={pendingAlchemy && isConfirming ? () => setIsConfirming(false) : undefined}
            error={error}
        >
            {pendingAlchemy ? (
                isConfirming && diceReady ? (
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2">
                            <EventDie
                                face={pendingAlchemy.eventDieFace}
                                size={48}
                                title="Alchemy event die result"
                            />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
                                    Rolled event die
                                </div>
                                <div className="font-semibold capitalize text-[var(--ui-text)]">
                                    {pendingAlchemy.eventDieFace}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-md border-2 border-[var(--ui-accent)] bg-[color-mix(in_oklab,var(--ui-accent)_12%,var(--ui-panel-raised))] px-3 py-3 text-[var(--ui-text)]">
                            <div className="font-semibold">
                                Confirm Alchemy selection: red {redDie} + yellow {yellowDie} = {total}.
                            </div>
                            <div className="mt-2 space-y-1 border-t border-[var(--ui-border)] pt-2 text-xs text-[var(--ui-muted)]">
                                <div>
                                    <span className="font-semibold text-[var(--ui-text)]">Resources:</span>{' '}
                                    {resourcePreview}
                                </div>
                                <div>
                                    <span className="font-semibold text-[var(--ui-text)]">Commodities:</span>{' '}
                                    {commodityPreview}
                                </div>
                                <div>
                                    <span className="font-semibold text-[var(--ui-text)]">Progress card:</span>{' '}
                                    {willDrawProgressCard === true
                                        ? `1 ${EVENT_CATEGORY_LABELS[eventCategory!]} card`
                                        : willDrawProgressCard === false
                                            ? 'none at this red die value'
                                            : 'none (Ship event)'}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2">
                            <EventDie
                                face={pendingAlchemy.eventDieFace}
                                size={48}
                                title="Alchemy event die result"
                            />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
                                    Rolled event die
                                </div>
                                <div className="font-semibold capitalize text-[var(--ui-text)]">
                                    {pendingAlchemy.eventDieFace}
                                </div>
                                <div className="text-xs text-amber-200">
                                    Result locked — choose both production dice.
                                </div>
                            </div>
                        </div>
                        <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-xs text-[var(--ui-muted)]">
                            <span className="font-semibold text-[var(--ui-text)]">
                                The red production die controls progress-card eligibility.
                            </span>{' '}
                            {eventCategory
                                ? `If your ${EVENT_CATEGORY_LABELS[eventCategory]} improvement qualifies, a red die of ${redDieThreshold > 0 ? `${redDieThreshold} or lower` : '1–6'} earns you a ${EVENT_CATEGORY_LABELS[eventCategory]} progress card.`
                                : 'A Ship result advances the barbarians and does not draw a progress card.'}
                        </div>
                        <DiePicker
                            label="Red Die"
                            colors={RED_DIE}
                            value={redDie}
                            onChange={chooseRedDie}
                        />
                        <DiePicker
                            label="Yellow Die"
                            colors={YELLOW_DIE}
                            value={yellowDie}
                            onChange={chooseYellowDie}
                        />
                        {willDrawProgressCard !== null ? (
                            <div
                                role="status"
                                aria-live="polite"
                                className={`rounded-md border px-3 py-2 text-sm ${willDrawProgressCard
                                    ? 'border-emerald-500/70 bg-emerald-950/30 text-emerald-200'
                                    : 'border-amber-500/70 bg-amber-950/30 text-amber-200'
                                    }`}
                            >
                                {willDrawProgressCard
                                    ? `Red ${redDie}: you will receive a ${EVENT_CATEGORY_LABELS[eventCategory!]} progress card.`
                                    : `Red ${redDie}: you will not receive a ${EVENT_CATEGORY_LABELS[eventCategory!]} progress card. Choose ${redDieThreshold > 0 ? `${redDieThreshold} or lower` : 'a qualifying improvement level'} to qualify.`}
                            </div>
                        ) : null}
                        {diceReady ? (
                            <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-raised)] px-3 py-2 text-sm">
                                Selected production roll:{' '}
                                <span className="font-semibold text-emerald-300">{total}</span>
                                {total === 7 ? (
                                    <span className="ml-2 text-amber-200">
                                        — a 7 moves the robber instead of producing.
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                )
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
